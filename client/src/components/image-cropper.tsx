import { useState, useRef } from 'react';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ImageCropperProps {
  file: File;
  onCropComplete: (croppedBlob: Blob) => void;
  onCancel: () => void;
  open: boolean;
}

export function ImageCropper({ file, onCropComplete, onCancel, open }: ImageCropperProps) {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 100,
    height: 100,
    x: 0,
    y: 0,
    aspect: 1
  });
  const [imageSrc, setImageSrc] = useState<string>('');
  const imageRef = useRef<HTMLImageElement>(null);

  // Load the image when the file changes
  useState(() => {
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  });

  const getCroppedImg = async () => {
    if (!imageRef.current) return;

    const canvas = document.createElement('canvas');
    const scaleX = imageRef.current.naturalWidth / imageRef.current.width;
    const scaleY = imageRef.current.naturalHeight / imageRef.current.height;

    canvas.width = crop.width;
    canvas.height = crop.height;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.drawImage(
      imageRef.current,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      crop.width,
      crop.height
    );

    return new Promise<Blob>((resolve) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          }
        },
        'image/jpeg',
        1
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
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Adjust Profile Picture</DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {imageSrc && (
            <ReactCrop
              crop={crop}
              onChange={c => setCrop(c)}
              aspect={1}
              circularCrop
            >
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Crop preview"
                className="max-h-[400px] w-auto"
              />
            </ReactCrop>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleCropComplete}>
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
