import { useEffect, useRef, useCallback } from 'react';

export function useSectionIntersection(
  options?: IntersectionObserverInit
): { ref: (el: HTMLElement | null) => void } {
  const elementsRef = useRef<HTMLElement[]>([]);

  const addRef = useCallback((el: HTMLElement | null) => {
    if (el && !elementsRef.current.includes(el)) {
      elementsRef.current.push(el);
    }
  }, []);

  useEffect(() => {
    const elements = elementsRef.current;
    if (!elements.length) return;

    const mergedOptions = { threshold: 0.15, ...options };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
            entry.target.classList.remove('out-view');
          } else {
            entry.target.classList.remove('in-view');
            entry.target.classList.add('out-view');
          }
        });
      },
      mergedOptions
    );

    elements.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return { ref: addRef };
}
