import { useEffect, useRef, useCallback } from 'react';

type AddRef = (el: HTMLElement | null) => void;

export function useScrollReveal(): AddRef {
  const elementsRef = useRef<HTMLElement[]>([]);

  const addRef = useCallback((el: HTMLElement | null) => {
    if (el && !elementsRef.current.includes(el)) {
      elementsRef.current.push(el);
    }
  }, []);

  useEffect(() => {
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
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    elementsRef.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return addRef;
}
