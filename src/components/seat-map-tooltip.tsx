import React, { useState, useEffect, useRef } from 'react';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Image from 'next/image';

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

// Airline seat config cache
const seatConfigCache: Record<string, any> = {};

export default function SeatMapTooltip({ airline, variant, aircraftType, children }: SeatMapTooltipProps) {
  const [imgExists, setImgExists] = useState(false);
  const [checked, setChecked] = useState(false);
  const [img1Exists, setImg1Exists] = useState(false);
  const [img2Exists, setImg2Exists] = useState(false);
  const [checkedDouble, setCheckedDouble] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [imgSize, setImgSize] = useState(300); // Default size for 1920px width
  const [seatConfig, setSeatConfig] = useState<any>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const lastAirline = useRef<string | null>(null);

  // Dynamically load seat config for the airline
  useEffect(() => {
    if (!airline) return;
    if (seatConfigCache[airline]) {
      setSeatConfig(seatConfigCache[airline]);
      setConfigLoading(false);
      setConfigError(null);
      return;
    }
    setConfigLoading(true);
    setConfigError(null);
    fetch(`${CLOUD_STORAGE_BASE_URL}/seat_${airline}.json`)
      .then(res => {
        if (!res.ok) throw new Error('Config not found');
        return res.json();
      })
      .then(data => {
        seatConfigCache[airline] = data;
        setSeatConfig(data);
        setConfigLoading(false);
        setConfigError(null);
      })
      .catch(() => {
        setSeatConfig(null);
        setConfigLoading(false);
        setConfigError('Seat config not found');
      });
  }, [airline]);

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

  // Responsive image size logic (from seat-type-viewer.jsx)
  useEffect(() => {
    const calculateSize = () => {
      const viewportWidth = window.innerWidth;
      // 300px is ~15.6% of 1920px
      const newSize = Math.round(viewportWidth * 0.156);
      setImgSize(newSize);
    };
    calculateSize();
    window.addEventListener('resize', calculateSize);
    return () => window.removeEventListener('resize', calculateSize);
  }, []);

  // Tooltip content (fit image to Popover, no vertical scroll)
  let tooltipContent: React.ReactNode = null;
  if (configLoading) {
    tooltipContent = <div style={{ padding: 16, textAlign: 'center' }}>Loading seat config...</div>;
  } else if (configError) {
    tooltipContent = <div style={{ padding: 16, color: 'red', textAlign: 'center' }}>{configError}</div>;
  } else if (doubleDecker) {
    if (!checkedDouble || (!img1Exists && !img2Exists)) tooltipContent = null;
    else tooltipContent = (
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center', alignItems: 'flex-start' }}>
        {img1Exists && (
          <div style={{ textAlign: 'center' }}>
            <Image src={url1} alt="Lower Deck" width={900} height={900} style={{ maxWidth: '48vw', maxHeight: '90vh', width: 'auto', height: 'auto', display: 'block' }} loading="lazy" />
            <div style={{ fontSize: 14, color: '#333', marginTop: 4 }}>Lower Deck</div>
          </div>
        )}
        {img2Exists && (
          <div style={{ textAlign: 'center' }}>
            <Image src={url2} alt="Upper Deck" width={900} height={900} style={{ maxWidth: '48vw', maxHeight: '90vh', width: 'auto', height: 'auto', display: 'block' }} loading="lazy" />
            <div style={{ fontSize: 14, color: '#333', marginTop: 4 }}>Upper Deck</div>
          </div>
        )}
      </div>
    );
  } else if (!checked || !imgExists) {
    tooltipContent = null;
  } else {
    tooltipContent = (
      <div style={{ textAlign: 'center' }}>
        <Image
          src={url}
          alt="Seat map"
          width={1200}
          height={900}
          style={{
            maxWidth: '90vw',
            maxHeight: '90vh',
            width: 'auto',
            height: 'auto',
            display: 'block',
          }}
          loading="lazy"
        />
        <div style={{ fontSize: 12, color: '#333', marginTop: 2 }}>Preview</div>
      </div>
    );
  }

  // Modal content (rotated -90deg, use imgSize for width, allow scroll)
  let modalContent: React.ReactNode = null;
  if (configLoading) {
    modalContent = <div style={{ padding: 32, textAlign: 'center' }}>Loading seat config...</div>;
  } else if (configError) {
    modalContent = <div style={{ padding: 32, color: 'red', textAlign: 'center' }}>{configError}</div>;
  } else if (doubleDecker) {
    if (!checkedDouble || (!img1Exists && !img2Exists)) modalContent = null;
    else modalContent = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: 16, alignItems: 'center' }}>
        {img2Exists && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 'bold' }}>Upper Deck</div>
            <div style={{ textAlign: 'center', transform: 'rotate(-90deg)', transformOrigin: 'center', width: `${imgSize}px`, height: `${imgSize}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '8px' }}>
              <Image src={url2} alt="Upper Deck" width={imgSize} height={imgSize} style={{ width: `${imgSize}px`, height: 'auto', display: 'block' }} loading="lazy" />
            </div>
          </div>
        )}
        {img1Exists && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ fontSize: 16, fontWeight: 'bold' }}>Lower Deck</div>
            <div style={{ textAlign: 'center', transform: 'rotate(-90deg)', transformOrigin: 'center', width: `${imgSize}px`, height: `${imgSize}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '8px' }}>
              <Image src={url1} alt="Lower Deck" width={imgSize} height={imgSize} style={{ width: `${imgSize}px`, height: 'auto', display: 'block' }} loading="lazy" />
            </div>
          </div>
        )}
        <div style={{ fontSize: 12, marginTop: 8, textAlign: 'center' }}>Source: aeroLOPA</div>
      </div>
    );
  } else if (!checked || !imgExists) {
    modalContent = null;
  } else {
    modalContent = (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 16 }}>
        <div style={{ textAlign: 'center', transform: 'rotate(-90deg)', transformOrigin: 'center', width: `${imgSize}px`, height: `${imgSize}px`, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '8px' }}>
          <Image
            src={url}
            alt="Seat map"
            width={imgSize}
            height={imgSize}
            style={{
              width: `${imgSize}px`,
              height: 'auto',
              display: 'block',
            }}
            loading="lazy"
          />
        </div>
        <div style={{ fontSize: 12, marginTop: 8, textAlign: 'center' }}>Source: aeroLOPA</div>
      </div>
    );
  }

  // Only show tooltip/modal if image(s) exist
  if ((doubleDecker && !checkedDouble) || (!doubleDecker && !checked)) {
    return <>{children}</>;
  }

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <span
            className="italic underline underline-offset-2 cursor-pointer"
            tabIndex={0}
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setModalOpen(true);
            }}
            onMouseEnter={() => setPopoverOpen(true)}
            onMouseLeave={() => setPopoverOpen(false)}
          >
            {children}
          </span>
        </PopoverTrigger>
        {tooltipContent && (
          <PopoverContent
            side="right"
            className="z-50"
            style={{
              width: 'auto',
              maxWidth: '90vw',
              height: 'fit-content',
              maxHeight: 'none',
              overflow: 'visible',
              padding: 0,
            }}
          >
            {tooltipContent}
          </PopoverContent>
        )}
      </Popover>
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[98vw] max-h-[98vh] overflow-auto">
          {modalContent}
        </DialogContent>
      </Dialog>
    </>
  );
} 