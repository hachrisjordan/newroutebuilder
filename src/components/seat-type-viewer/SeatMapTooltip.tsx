import React, { useState, useEffect } from 'react';
import { Modal, Tooltip } from 'antd';
import { CLOUD_STORAGE_BASE_URL } from '../../../config/cloud';
import { SeatMapTooltipProps } from '../../types/seat-viewer';

const SeatMapTooltip: React.FC<SeatMapTooltipProps> = ({ 
  airline, 
  variant, 
  children, 
  aircraftType 
}) => {
  const [imgSize, setImgSize] = useState(300); // Default size for 1920px width

  // Calculate image size based on viewport width
  useEffect(() => {
    const calculateSize = () => {
      const viewportWidth = window.innerWidth;
      // Calculate size as percentage of viewport width (300px is ~15.6% of 1920px)
      const newSize = Math.round(viewportWidth * 0.156);
      setImgSize(newSize);
    };

    calculateSize();
    window.addEventListener('resize', calculateSize);
    return () => window.removeEventListener('resize', calculateSize);
  }, []);

  const [imgExists, setImgExists] = useState(false);
  const [checked, setChecked] = useState(false);
  const [img1Exists, setImg1Exists] = useState(false);
  const [img2Exists, setImg2Exists] = useState(false);
  const [checkedDouble, setCheckedDouble] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const isDoubleDecker = aircraftType && (aircraftType.includes('747') || aircraftType.includes('380'));
  const url = `${CLOUD_STORAGE_BASE_URL}/seatmap/${airline}_${variant}.png`;
  const url1 = `${CLOUD_STORAGE_BASE_URL}/seatmap/${airline}_${variant}-1.png`;
  const url2 = `${CLOUD_STORAGE_BASE_URL}/seatmap/${airline}_${variant}-2.png`;

  // Single deck logic
  useEffect(() => {
    if (!airline || !variant || isDoubleDecker) return;
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
  }, [airline, variant, isDoubleDecker, url]);

  // Double deck logic
  useEffect(() => {
    if (!airline || !variant || !isDoubleDecker) return;
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
  }, [airline, variant, isDoubleDecker, url1, url2]);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setModalVisible(true);
  };

  if (!airline || !variant) return <>{children}</>;
  
  if (isDoubleDecker) {
    if (!checkedDouble) return <>{children}</>;
    if (!img1Exists && !img2Exists) return <>{children}</>;
    
    return (
      <>
        <Tooltip
          title={
            <div>
              <div style={{ display: 'flex', gap: 24, justifyContent: 'center', alignItems: 'flex-start', overflowX: 'auto' }}>
                {img1Exists && (
                  <div style={{ textAlign: 'center' }}>
                    <img 
                      src={url1} 
                      alt="Lower Deck" 
                      style={{ maxWidth: '48vw', maxHeight: 900, width: '100%', height: 'auto', display: 'block' }} 
                      loading="lazy" 
                    />
                    <div style={{ fontSize: 14, color: '#fff', marginTop: 4 }}>Lower Deck</div>
                  </div>
                )}
                {img2Exists && (
                  <div style={{ textAlign: 'center' }}>
                    <img 
                      src={url2} 
                      alt="Upper Deck" 
                      style={{ maxWidth: '48vw', maxHeight: 900, width: '100%', height: 'auto', display: 'block' }} 
                      loading="lazy" 
                    />
                    <div style={{ fontSize: 14, color: '#fff', marginTop: 4 }}>Upper Deck</div>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#fff', marginTop: 8, textAlign: 'center' }}>Source: aeroLOPA</div>
            </div>
          }
          overlayStyle={{ padding: 0, maxWidth: 1400, overflowX: 'auto' }}
          mouseEnterDelay={0.2}
          placement="right"
        >
          <span style={{ cursor: 'pointer', textDecoration: 'underline dotted' }} onClick={handleClick}>
            {children}
          </span>
        </Tooltip>
        <Modal
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          footer={null}
          width="auto"
          style={{ top: 20 }}
          bodyStyle={{ padding: 0 }}
        >
          <div style={{ display: 'flex', gap: 12, maxWidth: '95vw', maxHeight: '90vh', overflow: 'auto' }}>
            {img1Exists && (
              <div style={{ textAlign: 'center' }}>
                <img 
                  src={url1} 
                  alt="Lower Deck" 
                  style={{ maxWidth: '47vw', height: 'auto', display: 'block' }} 
                />
                <div style={{ fontSize: 16, marginTop: 8, fontWeight: 'bold' }}>Lower Deck</div>
              </div>
            )}
            {img2Exists && (
              <div style={{ textAlign: 'center' }}>
                <img 
                  src={url2} 
                  alt="Upper Deck" 
                  style={{ maxWidth: '47vw', height: 'auto', display: 'block' }} 
                />
                <div style={{ fontSize: 16, marginTop: 8, fontWeight: 'bold' }}>Upper Deck</div>
              </div>
            )}
          </div>
          <div style={{ fontSize: 14, textAlign: 'center', marginTop: 12, color: '#666' }}>Source: aeroLOPA</div>
        </Modal>
      </>
    );
  }

  // Single deck aircraft
  if (!checked) return <>{children}</>;
  if (!imgExists) return <>{children}</>;

  return (
    <>
      <Tooltip
        title={
          <div style={{ textAlign: 'center' }}>
            <img 
              src={url} 
              alt="Seat Map" 
              style={{ maxWidth: '70vw', maxHeight: 900, width: '100%', height: 'auto', display: 'block' }} 
              loading="lazy" 
            />
            <div style={{ fontSize: 12, color: '#fff', marginTop: 8 }}>Source: aeroLOPA</div>
          </div>
        }
        overlayStyle={{ padding: 0, maxWidth: 1400 }}
        mouseEnterDelay={0.2}
        placement="right"
      >
        <span style={{ cursor: 'pointer', textDecoration: 'underline dotted' }} onClick={handleClick}>
          {children}
        </span>
      </Tooltip>
      <Modal
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width="auto"
        style={{ top: 20 }}
        bodyStyle={{ padding: 0 }}
      >
        <div style={{ textAlign: 'center' }}>
          <img 
            src={url} 
            alt="Seat Map" 
            style={{ maxWidth: '95vw', maxHeight: '90vh', width: 'auto', height: 'auto' }} 
          />
          <div style={{ fontSize: 14, marginTop: 12, color: '#666' }}>Source: aeroLOPA</div>
        </div>
      </Modal>
    </>
  );
};

export default SeatMapTooltip;