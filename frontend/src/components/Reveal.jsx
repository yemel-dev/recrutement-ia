import { useEffect, useRef, useState } from "react";

/**
 * Fait apparaître son contenu (fondu + léger déplacement vers le haut)
 * quand il entre dans le viewport. Sobre et fluide — pas de rebond ni
 * d'effet criard, pour rester professionnel.
 *
 * Props:
 *  - delay (ms) : décale l'apparition, utile pour un effet "cascade"
 *    sur une grille de cartes.
 */
export default function Reveal({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"} ${className}`}
      style={{ transitionDelay: visible ? `${delay}ms` : "0ms" }}
    >
      {children}
    </div>
  );
}