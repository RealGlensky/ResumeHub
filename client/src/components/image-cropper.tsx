import { useState, useRef, useEffect } from 'react';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

interface ImageCropperProps {
  file: File;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
  open: boolean;
}

export function ImageCropper({ file, onCropComplete, onCancel, open }: ImageCropperProps) {
  const cropSize = 250; // Fixed size for the crop area
  const [crop, setCrop] = useState<Crop>({
    unit: 'px',
    width: cropSize,
    height: cropSize,
    x: 0,
    y: 0,
  });
  const [zoom, setZoom] = useState<number>(1);
  const [imageSrc, setImageSrc] = useState<string>('');
  const imageRef = useRef<HTMLImageElement>(null);

  // Load the image when the file changes
  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [file]);

  // Center the crop when the image loads
  useEffect(() => {
    if (imageRef.current && imageSrc) {
      const { width, height } = imageRef.current;
      setCrop(prev => ({
        ...prev,
        x: Math.max(0, (width - cropSize) / 2),
        y: Math.max(0, (height - cropSize) / 2)
      }));
    }
  }, [imageSrc, cropSize]);

  const getCroppedImg = async () => {
    if (!imageRef.current) return;

    const canvas = document.createElement('canvas');
    const size = 400; // Final profile picture size
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    // Calculate the scaling factors
    const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
    const scaleY = imageRef.current.naturalHeight / imageRef.current.height;

    // Apply zoom factor to the crop dimensions
    const cropX = crop.x * scaleX / zoom;
    const cropY = crop.y * scaleY / zoom;
    const cropWidth = crop.width * scaleX / zoom;
    const cropHeight = crop.height * scaleY / zoom;

    // Draw the image with zoom applied
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); // Create circular clip
    ctx.clip();

    ctx.drawImage(
      imageRef.current,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      size,
      size
    );

    ctx.restore();

    return new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          }
        },
        'image/jpeg',
        0.95
      );
    });
  };

  const handleCropComplete = async () => {
    const croppedBlob = await getCroppedImg();
    if (croppedBlob) {
      onCropComplete(croppedBlob);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Adjust Profile Picture</DialogTitle>
        </DialogHeader>
        <div className="mt-4 flex flex-col items-center space-y-4">
          <div className="relative w-full aspect-square bg-muted">
            {imageSrc && (
              <ReactCrop
                crop={crop}
                onChange={(_, percentCrop) => {
                  // Ensure the crop remains circular and fixed size
                  setCrop(prev => ({
                    ...prev,
                    x: percentCrop.x,
                    y: percentCrop.y,
                  }));
                }}
                aspect={1}
                circularCrop
                keepSelection
                minWidth={cropSize}
                minHeight={cropSize}
              >
                <img
                  ref={imageRef}
                  src={imageSrc}
                  alt="Crop preview"
                  style={{ 
                    transform: `scale(${zoom})`,
                    transformOrigin: 'center',
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    cursor: 'move'
                  }}
                />
              </ReactCrop>
            )}
          </div>

          <div className="w-full space-y-2 px-4">
            <div className="text-sm font-medium">Zoom</div>
            <Slider
              value={[zoom]}
              onValueChange={(value) => setZoom(value[0])}
              min={0.5}
              max={3}
              step={0.1}
              className="w-full"
            />
          </div>

          <div className="flex justify-end gap-2 w-full px-4">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleCropComplete}>
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}