import { useState, useRef, useCallback } from 'react';
import {
  Camera,
  Upload,
  X,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Check,
  Image as ImageIcon,
  Loader2,
  FileText,
  Trash2,
  GripVertical,
  AlertCircle,
  Calendar,
  Eye,
  ZoomIn,
} from 'lucide-react';
import { extractTextFromMultipleImages, type OcrResult } from '../../lib/ocr';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface PhotoItem {
  id: string;
  file: File;
  previewUrl: string;
  /** User-editable label, e.g. "Jan 14 dream" */
  label: string;
  /** OCR result after processing */
  ocrResult: OcrResult | null;
  /** Whether OCR has been run */
  ocrDone: boolean;
  /** OCR progress 0-100 */
  ocrProgress: number;
}

export interface DreamGroup {
  id: string;
  label: string;
  photoIds: string[];
  /** The date the user assigns to this dream */
  dreamDate: string;
}

interface PhotoUploadFlowProps {
  onClose: () => void;
  /** Called when user finalises one or more dream entries from photos */
  onDreamsExtracted: (entries: ExtractedDreamEntry[]) => void;
  /** Existing analyseDream function from the parent */
  analyzeDream: (text: string) => Promise<{
    category: string;
    themes: string[];
    emotion: string;
    symbols: string[];
    narrative: string;
    nugget: string;
    interpretation: {
      symbols: Record<string, string>;
      meaning: string;
      commonPattern: string;
    };
  }>;
}

export interface ExtractedDreamEntry {
  id: string;
  /** The OCR'd text from the photo(s) */
  ocrText: string;
  /** Which photo IDs contributed */
  photoIds: string[];
  /** User-editable before saving */
  editedText: string;
  /** The dream date the user assigned */
  dreamDate: string;
  /** AI analysis (filled after processing) */
  analysis: Awaited<ReturnType<PhotoUploadFlowProps['analyzeDream']>> | null;
  /** Whether AI analysis is in progress */
  analyzing: boolean;
}

type FlowStep = 'upload' | 'organize' | 'ocr' | 'review' | 'done';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const todayISO = () => new Date().toISOString().split('T')[0];

const LOW_CONFIDENCE_THRESHOLD = 40;

function confidenceLevel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 70) return 'high';
  if (confidence >= LOW_CONFIDENCE_THRESHOLD) return 'medium';
  return 'low';
}

function formatDate(isoStr: string): string {
  if (!isoStr) return '';
  const d = new Date(isoStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function PhotoUploadFlow({
  onClose,
  onDreamsExtracted,
  analyzeDream,
}: PhotoUploadFlowProps) {
  const [step, setStep] = useState<FlowStep>('upload');
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [dreamGroups, setDreamGroups] = useState<DreamGroup[]>([
    { id: `group-${Date.now()}`, label: 'Dream 1', photoIds: [], dreamDate: todayISO() },
  ]);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrTotalProgress, setOcrTotalProgress] = useState(0);
  const [extractedEntries, setExtractedEntries] = useState<ExtractedDreamEntry[]>([]);
  const [analyzingAll, setAnalyzingAll] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<PhotoItem | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Drag state for photo reordering between groups
  const [draggedPhotoId, setDraggedPhotoId] = useState<string | null>(null);
  const [dragTargetGroup, setDragTargetGroup] = useState<string | null>(null);

  /* ---------- photo ingestion ---------- */

  const addFiles = useCallback((files: FileList | File[]) => {
    const newPhotos: PhotoItem[] = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .map((file) => ({
        id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        label: file.name.replace(/\.[^.]+$/, ''),
        ocrResult: null,
        ocrDone: false,
        ocrProgress: 0,
      }));

    setPhotos((prev) => [...prev, ...newPhotos]);

    // Auto-assign to group with fewest photos
    setDreamGroups((prev) => {
      const updated = [...prev];
      newPhotos.forEach((p) => {
        const targetIdx = updated.reduce(
          (bestIdx, g, idx, arr) =>
            g.photoIds.length < arr[bestIdx].photoIds.length ? idx : bestIdx,
          0,
        );
        updated[targetIdx] = {
          ...updated[targetIdx],
          photoIds: [...updated[targetIdx].photoIds, p.id],
        };
      });
      return updated;
    });
  }, []);

  const removePhoto = useCallback((photoId: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === photoId);
      if (photo) URL.revokeObjectURL(photo.previewUrl);
      return prev.filter((p) => p.id !== photoId);
    });
    setDreamGroups((prev) =>
      prev.map((g) => ({ ...g, photoIds: g.photoIds.filter((id) => id !== photoId) })),
    );
  }, []);

  /* ---------- dream group management ---------- */

  const addDreamGroup = useCallback(() => {
    setDreamGroups((prev) => [
      ...prev,
      { id: `group-${Date.now()}`, label: `Dream ${prev.length + 1}`, photoIds: [], dreamDate: todayISO() },
    ]);
  }, []);

  const removeDreamGroup = useCallback(
    (idx: number) => {
      setDreamGroups((prev) => {
        if (prev.length <= 1) return prev;
        const removed = prev[idx];
        const updated = prev.filter((_, i) => i !== idx);
        // Move orphaned photos to first group
        if (removed.photoIds.length > 0) {
          updated[0] = {
            ...updated[0],
            photoIds: [...updated[0].photoIds, ...removed.photoIds],
          };
        }
        return updated;
      });
    },
    [],
  );

  const updateGroupLabel = useCallback((idx: number, label: string) => {
    setDreamGroups((prev) =>
      prev.map((g, i) => (i === idx ? { ...g, label } : g)),
    );
  }, []);

  const updateGroupDate = useCallback((idx: number, date: string) => {
    setDreamGroups((prev) =>
      prev.map((g, i) => (i === idx ? { ...g, dreamDate: date } : g)),
    );
  }, []);

  const movePhotoToGroup = useCallback((photoId: string, targetGroupIdx: number) => {
    setDreamGroups((prev) =>
      prev.map((g, i) => ({
        ...g,
        photoIds:
          i === targetGroupIdx
            ? [...g.photoIds, photoId]
            : g.photoIds.filter((id) => id !== photoId),
      })),
    );
  }, []);

  /* ---------- Drag and drop between groups ---------- */

  const handleDragStart = (photoId: string) => {
    setDraggedPhotoId(photoId);
  };

  const handleDragOver = (e: React.DragEvent, groupId: string) => {
    e.preventDefault();
    setDragTargetGroup(groupId);
  };

  const handleDragLeave = () => {
    setDragTargetGroup(null);
  };

  const handleDrop = (e: React.DragEvent, targetGroupId: string) => {
    e.preventDefault();
    if (!draggedPhotoId) return;
    setDreamGroups((prev) =>
      prev.map((g) => ({
        ...g,
        photoIds:
          g.id === targetGroupId
            ? g.photoIds.includes(draggedPhotoId)
              ? g.photoIds
              : [...g.photoIds, draggedPhotoId]
            : g.photoIds.filter((id) => id !== draggedPhotoId),
      })),
    );
    setDraggedPhotoId(null);
    setDragTargetGroup(null);
  };

  /* ---------- OCR ---------- */

  const runOcr = useCallback(async () => {
    setOcrRunning(true);
    setOcrTotalProgress(0);

    const pending = photos.filter((p) => !p.ocrDone);
    const total = pending.length;
    let completed = 0;

    await extractTextFromMultipleImages(
      pending.map((p) => ({ id: p.id, source: p.file })),
      (photoId, progress) => {
        setPhotos((prev) =>
          prev.map((p) => (p.id === photoId ? { ...p, ocrProgress: progress } : p)),
        );
      },
      (photoId, result) => {
        completed++;
        setOcrTotalProgress(Math.round((completed / total) * 100));
        setPhotos((prev) =>
          prev.map((p) =>
            p.id === photoId
              ? { ...p, ocrResult: result, ocrDone: true, ocrProgress: 100 }
              : p,
          ),
        );
      },
    );
    // results are applied via onPhotoComplete callback above

    setOcrRunning(false);
    setStep('review');
  }, [photos]);

  /* ---------- Build extracted entries from groups ---------- */

  const buildEntries = useCallback(() => {
    const entries: ExtractedDreamEntry[] = dreamGroups
      .filter((g) => g.photoIds.length > 0)
      .map((group) => {
        const groupPhotos = photos.filter((p) => group.photoIds.includes(p.id));
        const ocrText = groupPhotos
          .map((p) => p.ocrResult?.text || '')
          .filter(Boolean)
          .join('\n\n');

        return {
          id: `entry-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          ocrText,
          photoIds: group.photoIds,
          editedText: ocrText,
          dreamDate: group.dreamDate || todayISO(),
          analysis: null,
          analyzing: false,
        };
      });

    setExtractedEntries(entries);
  }, [dreamGroups, photos]);

  /* ---------- AI analysis ---------- */

  const analyzeAllEntries = useCallback(async () => {
    setAnalyzingAll(true);
    for (let i = 0; i < extractedEntries.length; i++) {
      const entry = extractedEntries[i];
      if (!entry.editedText.trim()) continue;

      setExtractedEntries((prev) =>
        prev.map((e, idx) => (idx === i ? { ...e, analyzing: true } : e)),
      );

      try {
        let analysis = await analyzeDream(entry.editedText);

        // Enrich with profile
        try {
          const profile = await loadCurrentUserProfile();
          analysis = enrichAnalysisWithProfile(analysis, profile);
        } catch {}
        setExtractedEntries((prev) =>
          prev.map((e, idx) =>
            idx === i ? { ...e, analysis, analyzing: false } : e,
          ),
        );
      } catch (err) {
        console.error('Analysis failed for entry', i, err);
        setExtractedEntries((prev) =>
          prev.map((e, idx) => (idx === i ? { ...e, analyzing: false } : e)),
        );
      }
    }
    setAnalyzingAll(false);
    setStep('done');
  }, [extractedEntries, analyzeDream]);

  /* ---------- Render helpers ---------- */

  const canProceedFromUpload = photos.length > 0;
  const canProceedFromOrganize = dreamGroups.some((g) => g.photoIds.length > 0);
  const allOcrDone = photos.length > 0 && photos.every((p) => p.ocrDone);
  const allAnalyzed = extractedEntries.length > 0 && extractedEntries.every((e) => e.analysis);

  // Count low-confidence results
  const lowConfCount = photos.filter(
    (p) => p.ocrDone && p.ocrResult && confidenceLevel(p.ocrResult.confidence) === 'low',
  ).length;

  /* ---------- STEP: Upload ---------- */

  const renderUpload = () => (
    <div className="space-y-5">
      <div className="text-center space-y-2">
        <div className="w-16 h-16 rounded-full bg-sage/10 flex items-center justify-center mx-auto">
          <Camera className="w-8 h-8 text-sage" strokeWidth={1.5} />
        </div>
        <h2 className="font-serif text-2xl font-medium text-ink">
          Upload journal photos
        </h2>
        <p className="text-sm text-muted max-w-sm mx-auto">
          Take photos of your handwritten or printed dream journal pages. You can
          upload several at once and we will help sort them into individual dream
          entries.
        </p>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files); }}
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition ${
          dragOver
            ? 'border-sage bg-sage/5'
            : 'border-line bg-parchment/50 hover:border-sage/50 hover:bg-parchment'
        }`}
      >
        <Upload className="w-10 h-10 text-muted mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-ink font-medium text-sm">
          Tap to browse or drag photos here
        </p>
        <p className="text-xs text-muted mt-1">JPG, PNG, WEBP - any size</p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
        />
      </div>

      {/* Camera capture button */}
      <button
        type="button"
        onClick={() => cameraInputRef.current?.click()}
        className="w-full border border-line bg-cream hover:bg-parchment py-3 rounded-2xl flex items-center justify-center gap-2 text-sm font-medium text-ink transition"
      >
        <Camera className="w-5 h-5 text-sage" strokeWidth={1.75} />
        Take photo with camera
      </button>
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ''; }}
      />

      {/* Photo previews */}
      {photos.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-wide text-muted font-medium">
            {photos.length} photo{photos.length !== 1 ? 's' : ''} selected
          </p>
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <div key={photo.id} className="relative group">
                <img
                  src={photo.previewUrl}
                  alt={photo.label}
                  className="w-full aspect-square object-cover rounded-xl border border-line"
                />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); removePhoto(photo.id); }}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-ink/60 text-cream flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setPreviewPhoto(photo); }}
                  className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-ink/60 text-cream flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  /* ---------- STEP: Organize ---------- */

  const renderOrganize = () => (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h2 className="font-serif text-2xl font-medium text-ink">
          Sort into dreams
        </h2>
        <p className="text-sm text-muted max-w-sm mx-auto">
          Drag or assign each photo to the dream entry it belongs to. Set the date
          for each dream. Tap a group name to rename it.
        </p>
      </div>

      {/* Dream groups */}
      <div className="space-y-4">
        {dreamGroups.map((group, gIdx) => {
          const groupPhotos = photos.filter((p) => group.photoIds.includes(p.id));
          const isDropTarget = dragTargetGroup === group.id;
          return (
            <div
              key={group.id}
              onDragOver={(e) => handleDragOver(e, group.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, group.id)}
              className={`rounded-2xl border p-4 space-y-3 transition ${
                isDropTarget ? 'border-sage bg-sage/5' : 'border-line bg-cream'
              }`}
            >
              <div className="flex items-center gap-2">
                <GripVertical className="w-4 h-4 text-muted shrink-0" />
                <input
                  type="text"
                  value={group.label}
                  onChange={(e) => updateGroupLabel(gIdx, e.target.value)}
                  placeholder="e.g. Jan 14, 2025"
                  className="flex-1 bg-parchment border border-line rounded-xl px-3 py-2 text-sm text-ink font-medium focus:outline-none focus:ring-2 focus:ring-sage/30"
                />
                {dreamGroups.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDreamGroup(gIdx)}
                    className="p-1.5 rounded-lg hover:bg-rose-50 text-muted hover:text-rose-600 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Date picker */}
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted shrink-0" />
                <input
                  type="date"
                  value={group.dreamDate}
                  onChange={(e) => updateGroupDate(gIdx, e.target.value)}
                  className="flex-1 bg-parchment border border-line rounded-xl px-3 py-1.5 text-xs text-ink focus:outline-none focus:ring-2 focus:ring-sage/30"
                />
                <span className="text-[10px] text-muted">{formatDate(group.dreamDate)}</span>
              </div>

              {groupPhotos.length === 0 ? (
                <p className="text-xs text-muted text-center py-4 border border-dashed border-line rounded-xl">
                  Drop photos here
                </p>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {groupPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      draggable
                      onDragStart={() => handleDragStart(photo.id)}
                      className={`relative group cursor-grab active:cursor-grabbing ${
                        draggedPhotoId === photo.id ? 'opacity-50' : ''
                      }`}
                    >
                      <img
                        src={photo.previewUrl}
                        alt={photo.label}
                        className="w-full aspect-square object-cover rounded-lg border border-line"
                      />
                      {/* Move-to-group dropdown on hover */}
                      <div className="absolute inset-0 bg-ink/50 rounded-lg opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <select
                          value={gIdx}
                          onChange={(e) => movePhotoToGroup(photo.id, Number(e.target.value))}
                          onClick={(e) => e.stopPropagation()}
                          onDragStart={(e) => e.stopPropagation()}
                          className="text-[10px] bg-cream rounded px-1 py-0.5 border border-line"
                        >
                          {dreamGroups.map((_, idx) => (
                            <option key={idx} value={idx}>
                              {dreamGroups[idx].label || `Dream ${idx + 1}`}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={addDreamGroup}
        className="w-full border border-dashed border-line bg-parchment/50 hover:bg-parchment py-3 rounded-2xl text-sm font-medium text-muted hover:text-ink transition flex items-center justify-center gap-2"
      >
        <ImageIcon className="w-4 h-4" />
        Add another dream group
      </button>

      {/* Unassigned photos */}
      {photos.filter((p) => !dreamGroups.some((g) => g.photoIds.includes(p.id))).length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-700 text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            Unassigned photos
          </div>
          <div className="grid grid-cols-5 gap-2">
            {photos
              .filter((p) => !dreamGroups.some((g) => g.photoIds.includes(p.id)))
              .map((photo) => (
                <div
                  key={photo.id}
                  draggable
                  onDragStart={() => handleDragStart(photo.id)}
                  className="relative cursor-grab active:cursor-grabbing"
                >
                  <img
                    src={photo.previewUrl}
                    alt={photo.label}
                    className="w-full aspect-square object-cover rounded-lg border border-amber-200"
                  />
                  <select
                    value={-1}
                    onChange={(e) => { const idx = Number(e.target.value); if (idx >= 0) movePhotoToGroup(photo.id, idx); }}
                    className="absolute bottom-0 inset-x-0 text-[9px] bg-cream/90 rounded-b-lg px-1 py-0.5 border-t border-amber-200"
                  >
                    <option value={-1}>Move to...</option>
                    {dreamGroups.map((g, idx) => (
                      <option key={idx} value={idx}>
                        {g.label || `Dream ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );

  /* ---------- STEP: OCR ---------- */

  const renderOcr = () => (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h2 className="font-serif text-2xl font-medium text-ink">
          Reading your journal
        </h2>
        <p className="text-sm text-muted max-w-sm mx-auto">
          Extracting text from your photos using on-device OCR with image
          enhancement. This happens entirely in your browser.
        </p>
      </div>

      {!ocrRunning && !allOcrDone && (
        <button
          type="button"
          onClick={runOcr}
          className="w-full bg-sage hover:bg-sageDark text-cream font-semibold py-3.5 rounded-2xl transition flex items-center justify-center gap-2 shadow-paper text-sm"
        >
          <FileText className="w-5 h-5" strokeWidth={1.75} />
          Start reading {photos.length} photo{photos.length !== 1 ? 's' : ''}
        </button>
      )}

      {ocrRunning && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-line bg-parchment p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-ink">Overall progress</span>
              <span className="text-sm text-muted">{ocrTotalProgress}%</span>
            </div>
            <div className="w-full bg-line rounded-full h-2.5">
              <div
                className="bg-sage h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${ocrTotalProgress}%` }}
              />
            </div>
          </div>
          <div className="space-y-2">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="flex items-center gap-3 rounded-xl border border-line bg-cream px-3 py-2"
              >
                <img
                  src={photo.previewUrl}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover border border-line shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-ink truncate">{photo.label}</p>
                  {photo.ocrDone ? (
                    <p className="text-[10px] text-sage font-medium">Done</p>
                  ) : (
                    <div className="w-full bg-line rounded-full h-1.5 mt-1">
                      <div
                        className="bg-sage h-1.5 rounded-full transition-all"
                        style={{ width: `${photo.ocrProgress}%` }}
                      />
                    </div>
                  )}
                </div>
                {photo.ocrDone ? (
                  <Check className="w-4 h-4 text-sage shrink-0" />
                ) : (
                  <Loader2 className="w-4 h-4 text-muted animate-spin shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {allOcrDone && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-sage/30 bg-sage/5 p-4 text-center">
            <Check className="w-8 h-8 text-sage mx-auto mb-2" />
            <p className="text-sm font-medium text-ink">
              All {photos.length} photos processed
            </p>
            <p className="text-xs text-muted mt-1">
              Review the extracted text next
            </p>
          </div>

          {/* Low confidence warnings */}
          {lowConfCount > 0 && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4">
              <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-2">
                <AlertCircle className="w-4 h-4" />
                {lowConfCount} photo{lowConfCount !== 1 ? 's' : ''} with low text confidence
              </div>
              <p className="text-xs text-amber-600">
                The text from these photos may be incomplete or inaccurate. You can
                review and edit them in the next step.
              </p>
              <div className="mt-3 space-y-2">
                {photos
                  .filter((p) => p.ocrDone && p.ocrResult && confidenceLevel(p.ocrResult.confidence) === 'low')
                  .map((p) => (
                    <div key={p.id} className="flex items-center gap-2 text-xs">
                      <img src={p.previewUrl} alt="" className="w-8 h-8 rounded object-cover border border-amber-200" />
                      <span className="text-amber-700 truncate flex-1">{p.label}</span>
                      <span className="text-amber-500 shrink-0">{Math.round(p.ocrResult?.confidence || 0)}% conf</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  /* ---------- STEP: Review ---------- */

  const renderReview = () => (
    <div className="space-y-5">
      <div className="text-center space-y-1">
        <h2 className="font-serif text-2xl font-medium text-ink">
          Review extracted text
        </h2>
        <p className="text-sm text-muted max-w-sm mx-auto">
          Check the OCR results below. Edit any text that was not read correctly,
          then we will analyze each dream.
        </p>
      </div>

      {extractedEntries.map((entry, eIdx) => {
        const group = dreamGroups[eIdx];
        const groupPhotos = photos.filter((p) => entry.photoIds.includes(p.id));
        return (
          <div
            key={entry.id}
            className="rounded-2xl border border-line bg-cream p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <input
                type="text"
                value={group?.label || `Dream ${eIdx + 1}`}
                onChange={(e) => updateGroupLabel(eIdx, e.target.value)}
                className="text-sm font-semibold text-ink bg-transparent border-b border-transparent hover:border-line focus:border-sage focus:outline-none px-0 py-0.5"
              />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted">{formatDate(entry.dreamDate)}</span>
                <span className="text-[10px] text-muted uppercase tracking-wide">
                  {groupPhotos.length} photo{groupPhotos.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {/* Photo thumbnails with confidence indicators */}
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {groupPhotos.map((p) => {
                const conf = p.ocrResult?.confidence || 0;
                const level = confidenceLevel(conf);
                return (
                  <div key={p.id} className="relative shrink-0">
                    <img
                      src={p.previewUrl}
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover border border-line cursor-pointer"
                      onClick={() => setPreviewPhoto(p)}
                    />
                    <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border border-cream ${
                      level === 'high' ? 'bg-sage' : level === 'medium' ? 'bg-amber-400' : 'bg-rose-400'
                    }`} />
                  </div>
                );
              })}
            </div>

            {/* OCR text editor */}
            <textarea
              value={entry.editedText}
              onChange={(e) =>
                setExtractedEntries((prev) =>
                  prev.map((en, idx) =>
                    idx === eIdx ? { ...en, editedText: e.target.value } : en,
                  ),
                )
              }
              placeholder="OCR text will appear here..."
              className="w-full min-h-[100px] bg-parchment border border-line rounded-xl p-3 text-sm text-ink placeholder:text-muted/60 font-serif leading-relaxed focus:outline-none focus:ring-2 focus:ring-sage/30 resize-none"
            />

            {/* Per-photo OCR details (collapsible) */}
            <details className="text-xs text-muted">
              <summary className="cursor-pointer hover:text-ink flex items-center gap-1">
                <Eye className="w-3 h-3" />
                View per-photo results
              </summary>
              <div className="mt-2 space-y-2">
                {groupPhotos.map((p) => {
                  const conf = p.ocrResult?.confidence || 0;
                  const level = confidenceLevel(conf);
                  return (
                    <div
                      key={p.id}
                      className={`rounded-lg border p-2 ${
                        level === 'low' ? 'border-amber-200 bg-amber-50/50' : 'border-line bg-parchment'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-ink truncate">{p.label}</span>
                        <span className={`text-[10px] shrink-0 px-1.5 py-0.5 rounded-full ${
                          level === 'high'
                            ? 'bg-sage/10 text-sage'
                            : level === 'medium'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                        }`}>
                          {Math.round(conf)}% conf
                        </span>
                      </div>
                      <p className="text-muted leading-relaxed">
                        {p.ocrResult?.text || '(no text detected)'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </details>

            {/* Analysis result */}
            {entry.analysis && (
              <div className="rounded-xl border border-dusk/20 bg-dusk/5 p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium text-ink">
                  <Sparkles className="w-4 h-4 text-dusk" />
                  AI Analysis
                </div>
                <p className="text-xs text-muted italic">"{entry.analysis.nugget}"</p>
                <div className="flex flex-wrap gap-1">
                  {entry.analysis.themes.slice(0, 4).map((t) => (
                    <span
                      key={t}
                      className="text-[10px] bg-parchment border border-line px-2 py-0.5 rounded-full text-muted"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {entry.analyzing && (
              <div className="flex items-center gap-2 text-xs text-muted">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Analyzing...
              </div>
            )}
          </div>
        );
      })}

      {!analyzingAll && !allAnalyzed && (
        <button
          type="button"
          onClick={analyzeAllEntries}
          disabled={extractedEntries.every((e) => !e.editedText.trim())}
          className="w-full bg-sage hover:bg-sageDark disabled:opacity-45 text-cream font-semibold py-3.5 rounded-2xl transition flex items-center justify-center gap-2 shadow-paper text-sm"
        >
          <Sparkles className="w-5 h-5" strokeWidth={1.75} />
          Analyze {extractedEntries.length} dream{extractedEntries.length !== 1 ? 's' : ''}
        </button>
      )}

      {analyzingAll && (
        <div className="rounded-2xl border border-line bg-parchment p-4 text-center">
          <Loader2 className="w-6 h-6 text-sage animate-spin mx-auto mb-2" />
          <p className="text-sm text-ink font-medium">Analyzing your dreams...</p>
          <p className="text-xs text-muted mt-1">This may take a moment</p>
        </div>
      )}
    </div>
  );

  /* ---------- STEP: Done ---------- */

  const renderDone = () => (
    <div className="space-y-5 text-center">
      <div className="w-16 h-16 rounded-full bg-sage/10 flex items-center justify-center mx-auto">
        <Check className="w-8 h-8 text-sage" strokeWidth={1.5} />
      </div>
      <h2 className="font-serif text-2xl font-medium text-ink">
        {extractedEntries.length} dream{extractedEntries.length !== 1 ? 's' : ''} ready
      </h2>
      <p className="text-sm text-muted max-w-sm mx-auto">
        Your journal photos have been converted into dream entries. Save them to
        your journal to see full interpretations and visualizations.
      </p>

      <div className="space-y-2">
        {extractedEntries.map((entry) => (
          <div
            key={entry.id}
            className="rounded-xl border border-line bg-cream p-3 text-left"
          >
            <p className="text-sm font-serif text-ink italic">
              "{entry.analysis?.nugget || entry.editedText.slice(0, 80)}"
            </p>
            <p className="text-[10px] text-muted mt-1">
              {dreamGroups.find((g) => g.photoIds.some((id) => entry.photoIds.includes(id)))?.label || 'Dream'}
              {' · '}
              {formatDate(entry.dreamDate)}
              {' · '}
              {entry.analysis?.category || 'pending'}
            </p>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onDreamsExtracted(extractedEntries)}
        className="w-full bg-sage hover:bg-sageDark text-cream font-semibold py-3.5 rounded-2xl transition flex items-center justify-center gap-2 shadow-paper text-sm"
      >
        <Check className="w-5 h-5" strokeWidth={1.75} />
        Save to journal
      </button>
    </div>
  );

  /* ---------- Photo Preview Modal ---------- */

  const renderPreviewModal = () => {
    if (!previewPhoto) return null;
    return (
      <div
        className="fixed inset-0 z-[90] bg-ink/80 flex items-center justify-center p-4"
        onClick={() => setPreviewPhoto(null)}
      >
        <div
          className="relative max-w-lg w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={previewPhoto.previewUrl}
            alt={previewPhoto.label}
            className="w-full rounded-2xl object-contain max-h-[80vh]"
          />
          <button
            type="button"
            onClick={() => setPreviewPhoto(null)}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-ink/60 text-cream flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <span className="text-cream text-sm font-medium bg-ink/60 rounded-lg px-3 py-1">
              {previewPhoto.label}
            </span>
            {previewPhoto.ocrDone && previewPhoto.ocrResult && (
              <span className={`text-xs font-medium rounded-lg px-2 py-1 ${
                confidenceLevel(previewPhoto.ocrResult.confidence) === 'high'
                  ? 'bg-sage/80 text-cream'
                  : confidenceLevel(previewPhoto.ocrResult.confidence) === 'medium'
                    ? 'bg-amber-400/80 text-ink'
                    : 'bg-rose-400/80 text-cream'
              }`}>
                {Math.round(previewPhoto.ocrResult.confidence)}% confidence
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ---------- Main layout ---------- */

  const stepIndex = ['upload', 'organize', 'ocr', 'review', 'done'].indexOf(step);
  const stepLabels = ['Photos', 'Sort', 'Read', 'Review', 'Done'];

  return (
    <div className="fixed inset-0 z-[80] bg-paper flex flex-col">
      {/* Photo preview modal */}
      {renderPreviewModal()}

      {/* Header */}
      <header className="shrink-0 border-b border-line bg-cream/95 backdrop-blur-md">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-parchment transition"
          >
            <X className="w-5 h-5 text-muted" />
          </button>
          <div className="text-center">
            <p className="font-serif text-lg font-medium text-ink">
              Import journal photos
            </p>
          </div>
          <div className="w-9" />
        </div>
        {/* Step indicator */}
        <div className="max-w-lg mx-auto px-4 pb-2 flex gap-1">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={`h-1 rounded-full transition-all ${
                  i <= stepIndex ? 'bg-sage' : 'bg-line'
                }`}
              />
              <span
                className={`text-[9px] uppercase tracking-wider ${
                  i === stepIndex ? 'text-sage font-semibold' : 'text-muted'
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </header>

      {/* Body */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto px-4 py-5">
          {step === 'upload' && renderUpload()}
          {step === 'organize' && renderOrganize()}
          {step === 'ocr' && renderOcr()}
          {step === 'review' && renderReview()}
          {step === 'done' && renderDone()}
        </div>
      </main>

      {/* Footer navigation */}
      <footer className="shrink-0 border-t border-line bg-cream/95 backdrop-blur-md">
        <div className="max-w-lg mx-auto px-4 py-3 flex gap-3">
          {step !== 'upload' && step !== 'done' && (
            <button
              type="button"
              onClick={() => {
                const steps: FlowStep[] = ['upload', 'organize', 'ocr', 'review', 'done'];
                const idx = steps.indexOf(step);
                if (idx > 0) setStep(steps[idx - 1]);
              }}
              className="flex-1 border border-line bg-parchment hover:bg-parchment/80 py-3 rounded-2xl font-semibold transition text-sm text-ink flex items-center justify-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>
          )}

          {step === 'upload' && (
            <button
              type="button"
              onClick={() => { if (canProceedFromUpload) setStep('organize'); }}
              disabled={!canProceedFromUpload}
              className="flex-1 bg-sage hover:bg-sageDark disabled:opacity-45 text-cream py-3 rounded-2xl font-semibold transition text-sm flex items-center justify-center gap-1"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 'organize' && (
            <button
              type="button"
              onClick={() => { if (canProceedFromOrganize) setStep('ocr'); }}
              disabled={!canProceedFromOrganize}
              className="flex-1 bg-sage hover:bg-sageDark disabled:opacity-45 text-cream py-3 rounded-2xl font-semibold transition text-sm flex items-center justify-center gap-1"
            >
              Read text
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 'ocr' && allOcrDone && (
            <button
              type="button"
              onClick={() => { buildEntries(); setStep('review'); }}
              className="flex-1 bg-sage hover:bg-sageDark text-cream py-3 rounded-2xl font-semibold transition text-sm flex items-center justify-center gap-1"
            >
              Review text
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          {step === 'review' && allAnalyzed && (
            <button
              type="button"
              onClick={() => setStep('done')}
              className="flex-1 bg-sage hover:bg-sageDark text-cream py-3 rounded-2xl font-semibold transition text-sm flex items-center justify-center gap-1"
            >
              Continue
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}
