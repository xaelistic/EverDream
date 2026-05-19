import React from 'react';
import { Card, Skeleton } from '../ui';

export interface DreamSkeletonProps {
  count?: number;
}

/**
 * DreamSkeleton — Loading placeholder for dream cards grid.
 * Shows a grid of skeleton cards matching the DreamList layout.
 *
 * @example
 * {isLoading && <DreamSkeleton count={6} />}
 */
export default function DreamSkeleton({ count = 6 }: DreamSkeletonProps) {
  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header skeleton */}
      <div style={{ marginBottom: '32px' }}>
        <Skeleton lines={2} />
      </div>

      {/* Search/filter skeleton */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '24px',
      }}>
        <div style={{
          flex: '1 1 260px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(90deg, rgba(168,237,220,0.1) 25%, rgba(168,237,220,0.2) 50%, rgba(168,237,220,0.1) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }} />
        <div style={{
          width: '160px',
          height: '42px',
          borderRadius: '12px',
          background: 'linear-gradient(90deg, rgba(168,237,220,0.1) 25%, rgba(168,237,220,0.2) 50%, rgba(168,237,220,0.1) 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }} />
      </div>

      {/* Card grid skeleton */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '20px',
      }}>
        {Array.from({ length: count }).map((_, i) => (
          <Card key={i}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Card header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{
                  width: '60px',
                  height: '20px',
                  borderRadius: '20px',
                  background: 'linear-gradient(90deg, rgba(168,237,220,0.1) 25%, rgba(168,237,220,0.2) 50%, rgba(168,237,220,0.1) 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                }} />
                <div style={{
                  width: '50px',
                  height: '12px',
                  borderRadius: '6px',
                  background: 'linear-gradient(90deg, rgba(168,237,220,0.1) 25%, rgba(168,237,220,0.2) 50%, rgba(168,237,220,0.1) 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                }} />
              </div>

              {/* Title */}
              <div style={{
                width: '70%',
                height: '18px',
                borderRadius: '8px',
                background: 'linear-gradient(90deg, rgba(168,237,220,0.1) 25%, rgba(168,237,220,0.2) 50%, rgba(168,237,220,0.1) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }} />

              {/* Content lines */}
              <Skeleton lines={2} />

              {/* Footer */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(168,237,220,0.15)',
              }}>
                <div style={{
                  width: '80px',
                  height: '12px',
                  borderRadius: '6px',
                  background: 'linear-gradient(90deg, rgba(168,237,220,0.1) 25%, rgba(168,237,220,0.2) 50%, rgba(168,237,220,0.1) 75%)',
                  backgroundSize: '200% 100%',
                  animation: 'shimmer 1.5s infinite',
                }} />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
