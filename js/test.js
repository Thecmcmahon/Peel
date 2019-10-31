
      let leon, canvas, ctx;

      const sw = 800;
      const sh = 600;
      const pixelRatio = 2;

      function init() {
          canvas = document.createElement('canvas');
          document.body.appendChild(canvas);
          ctx = canvas.getContext("2d");

          canvas.width = sw * pixelRatio;
          canvas.height = sh * pixelRatio;
          canvas.style.width = sw + 'px';
          canvas.style.height = sh + 'px';
          ctx.scale(pixelRatio, pixelRatio);

          leon = new LeonSans({
              text: 'test',
              color: ['#000000'],
              size: 80,
              weight: 200
          });

          requestAnimationFrame(animate);
          document.body.insertBefore(canvas, main);
      }

      function animate(t) {
          requestAnimationFrame(animate);

          ctx.clearRect(0, 0, sw, sh);

          const x = (sw - leon.rect.w) / 2;
          const y = (sh - leon.rect.h) / 2;
          leon.position(x, y);

          leon.draw(ctx);
      }

      window.onload = () => {
          init();
      };
