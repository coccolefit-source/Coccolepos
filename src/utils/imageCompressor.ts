/**
 * Compresor de imágenes para evitar exceder la cuota de localStorage.
 * Redimensiona y comprime imágenes a JPEG ligero de baja resolución (aprox 15KB - 40KB).
 */
export function compressImage(
  src: File | string,
  maxWidth: number = 500,
  maxHeight: number = 500,
  quality: number = 0.5
): Promise<string> {
  return new Promise((resolve, reject) => {
    const processImageSource = (imgSrc: string) => {
      // Si la imagen es un preset o URL de Unsplash, no la procesamos
      if (imgSrc.startsWith('http://') || imgSrc.startsWith('https://')) {
        resolve(imgSrc);
        return;
      }

      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calcular escala respetando el aspecto original
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(imgSrc); // Retorna original si no se puede inicializar el canvas
          return;
        }

        // Dibujar y comprimir en formato JPEG con calidad reducida
        ctx.drawImage(img, 0, 0, width, height);
        try {
          const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(compressedDataUrl);
        } catch (e) {
          resolve(imgSrc); // Retorna original si falla la conversión de datos
        }
      };

      img.onerror = () => {
        resolve(imgSrc); // Retorna original si falla la carga de la imagen
      };

      img.src = imgSrc;
    };

    if (src instanceof File) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          processImageSource(reader.result);
        } else {
          resolve('');
        }
      };
      reader.onerror = () => {
        resolve('');
      };
      reader.readAsDataURL(src);
    } else {
      processImageSource(src);
    }
  });
}
