import { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import './GridMotion.css';

const GridMotion = ({ items = [], gradientColor = 'black' }) => {
  const gridRef = useRef(null);
  const rowRefs = useRef([]);
  const ROW_OFFSETS = [0, 22, 12, 11];

  const totalItems = 28;
  const defaultItems = Array.from({ length: totalItems }, (_, index) => `Item ${index + 1}`);
  const combinedItems = items.length > 0 ? items.slice(0, totalItems) : defaultItems;

  useLayoutEffect(() => {
    const tweens = [];

    rowRefs.current.forEach((row, index) => {
      if (!row) return;
      const speed = 40 + index * 8;
      // Each row has 3 identical sets of images; move exactly one set width
      const oneSetWidth = row.scrollWidth / 3;

      let tween;
      if (index % 2 === 0) {
        // Even rows: scroll left (0 → -oneSetWidth, repeat seamlessly)
        tween = gsap.fromTo(row,
          { x: 0 },
          { x: -oneSetWidth, duration: speed, ease: 'none', repeat: -1 }
        );
      } else {
        // Odd rows: scroll right (-oneSetWidth → 0, repeat seamlessly)
        tween = gsap.fromTo(row,
          { x: -oneSetWidth },
          { x: 0, duration: speed, ease: 'none', repeat: -1 }
        );
      }
      tweens.push(tween);
    });

    return () => tweens.forEach(t => t.kill());
  }, []);

  return (
    <div className="noscroll loading" ref={gridRef}>
      <section
        className="intro"
        style={{
          background: `radial-gradient(circle, ${gradientColor} 0%, transparent 100%)`
        }}
      >
        <div className="gridMotion-container">
          {[...Array(4)].map((_, rowIndex) => (
            <div key={rowIndex} className="row" ref={el => (rowRefs.current[rowIndex] = el)}>
              {[...Array(21)].map((_, itemIndex) => {
                const content = combinedItems[(ROW_OFFSETS[rowIndex] + itemIndex) % combinedItems.length];
                return (
                  <div key={itemIndex} className="row__item">
                    <div className="row__item-inner" style={{ backgroundColor: '#111' }}>
                      {typeof content === 'string' && content.startsWith('http') ? (
                        <div
                          className="row__item-img"
                          style={{
                            backgroundImage: `url(${content})`
                          }}
                        ></div>
                      ) : (
                        <div className="row__item-content">{content}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="fullview"></div>
      </section>
    </div>
  );
};

export default GridMotion;
