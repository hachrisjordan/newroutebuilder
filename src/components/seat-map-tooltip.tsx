import React, { useState, useEffect } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Dialog, DialogContent } from '@/components/ui/dialog';

interface SeatMapTooltipProps {
  airline: string;
  variant: string;
  aircraftType?: string;
  children: React.ReactNode;
}

const CLOUD_STORAGE_BASE_URL = 'https://storage.googleapis.com/routebuilder_storage';

function isDoubleDecker(aircraftType?: string) {
  return aircraftType && (aircraftType.includes('747') || aircraftType.includes('380'));
}

export default function SeatMapTooltip({ airline, variant, aircraftType, children }: SeatMapTooltipProps) {
  const [imgExists, setImgExists] = useState(false);
  const [checked, setChecked] = useState(false);
  const [img1Exists, setImg1Exists] = useState(false);
  const [img2Exists, setImg2Exists] = useState(false);
  const [checkedDouble, setCheckedDouble] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [imgSize, setImgSize] = useState(300);

  const doubleDecker = isDoubleDecker(aircraftType);
  const url = `${CLOUD_STORAGE_BASE_URL}/seatmap/${airline}_${variant}.png`;
  const url1 = `${CLOUD_STORAGE_BASE_URL}/seatmap/${airline}_${variant}-1.png`;
  const url2 = `${CLOUD_STORAGE_BASE_URL}/seatmap/${airline}_${variant}-2.png`;

  // Single deck logic
  useEffect(() => {
    if (!airline || !variant || doubleDecker) return;
    setChecked(false);
    setImgExists(false);
    const img = new window.Image();
    img.src = url;
    img.onload = () => {
      setImgExists(true);
      setChecked(true);
    };
    img.onerror = () => {
      setImgExists(false);
      setChecked(true);
    };
  }, [airline, variant, doubleDecker, url]);

  // Double deck logic
  useEffect(() => {
    if (!airline || !variant || !doubleDecker) return;
    setCheckedDouble(false);
    setImg1Exists(false);
    setImg2Exists(false);
    let loaded = 0;
    const done = () => { loaded++; if (loaded === 2) setCheckedDouble(true); };
    const img1 = new window.Image();
    img1.src = url1;
    img1.onload = () => { setImg1Exists(true); done(); };
    img1.onerror = () => { setImg1Exists(false); done(); };
    const img2 = new window.Image();
    img2.src = url2;
    img2.onload = () => { setImg2Exists(true); done(); };
    img2.onerror = () => { setImg2Exists(false); done(); };
  }, [airline, variant, doubleDecker, url1, url2]);

  // Responsive image size logic
  useEffect(() => {
    const calculateSize = () => {
      const viewportWidth = window.innerWidth;
      const newSize = Math.round(viewportWidth * 0.156);
      setImgSize(newSize);
    };
    calculateSize();
    window.addEventListener('resize', calculateSize);
    return () => window.removeEventListener('resize', calculateSize);
  }, []);

  // Only show tooltip/modal if image(s) exist
  if ((doubleDecker && !checkedDouble) || (!doubleDecker && !checked)) {
    return <>{children}</>;
  }

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setModalOpen(true);
  };

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <span
            className="italic underline underline-offset-2 cursor-pointer"
            onMouseEnter={() => setPopoverOpen(true)}
            onMouseLeave={() => setPopoverOpen(false)}
            onClick={handleClick}
          >
            {children}
          </span>
        </PopoverTrigger>
        <PopoverContent
          side="right"
          className="w-auto p-0"
          onOpenAutoFocus={(e) => e.preventDefault()}
          onMouseEnter={() => setPopoverOpen(true)}
          onMouseLeave={() => setPopoverOpen(false)}
        >
          {doubleDecker ? (
            <div style={{ display: 'flex', gap: 24, justifyContent: 'center', alignItems: 'flex-start' }}>
              {img1Exists && (
                <div style={{ textAlign: 'center' }}>
                  <img src={url1} alt="Lower Deck" style={{ maxWidth: '48vw', maxHeight: 900, width: '100%', height: 'auto', display: 'block' }} loading="lazy" />
                  <div style={{ fontSize: 14, color: '#fff', marginTop: 4 }}>Lower Deck</div>
                </div>
              )}
              {img2Exists && (
                <div style={{ textAlign: 'center' }}>
                  <img src={url2} alt="Upper Deck" style={{ maxWidth: '48vw', maxHeight: 900, width: '100%', height: 'auto', display: 'block' }} loading="lazy" />
                  <div style={{ fontSize: 14, color: '#fff', marginTop: 4 }}>Upper Deck</div>
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <img src={url} alt="Seat map" style={{ maxWidth: 1200, maxHeight: 900, display: 'block' }} loading="lazy" />
              <div style={{ fontSize: 12, color: '#333', marginTop: 2 }}>Preview</div>
            </div>
          )}
        </PopoverContent>
      </Popover>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[98vw] max-h-[98vh] overflow-auto">
          {doubleDecker ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, alignItems: 'center' }}>
              {img2Exists && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 'bold' }}>Upper Deck</div>
                  <div style={{ textAlign: 'center', transform: 'rotate(-90deg)', transformOrigin: 'center', width: `${imgSize}px`, height: `${imgSize}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '8px' }}>
                    <img src={url2} alt="Upper Deck" style={{ width: `${imgSize}px`, height: 'auto', display: 'block' }} loading="lazy" />
                  </div>
                </div>
              )}
              {img1Exists && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 'bold' }}>Lower Deck</div>
                  <div style={{ textAlign: 'center', transform: 'rotate(-90deg)', transformOrigin: 'center', width: `${imgSize}px`, height: `${imgSize}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '8px' }}>
                    <img src={url1} alt="Lower Deck" style={{ width: `${imgSize}px`, height: 'auto', display: 'block' }} loading="lazy" />
                  </div>
                </div>
              )}
              <div style={{ fontSize: 12, marginTop: 8, textAlign: 'center' }}>Source: aeroLOPA</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 16 }}>
              <div style={{ textAlign: 'center', transform: 'rotate(-90deg)', transformOrigin: 'center', width: `${imgSize}px`, height: `${imgSize}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '8px' }}>
                <img src={url} alt="Seat map" style={{ width: `${imgSize}px`, height: 'auto', display: 'block' }} loading="lazy" />
              </div>
              <div style={{ fontSize: 12, marginTop: 8, textAlign: 'center' }}>Source: aeroLOPA</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      {/* Hidden preloader */}
      <img src={url} style={{ display: 'none' }} alt="" aria-hidden="true" />
    </>
  );
} 