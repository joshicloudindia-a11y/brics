import React, { useEffect, useState } from 'react';
import { X, Linkedin, Youtube, Instagram, Twitter } from 'lucide-react';
import { getSpeakerById } from '../../services/speakers';

const SpeakerModal = ({ open, onClose, speakerId, initialSpeaker = null }) => {
  const [loading, setLoading] = useState(false);
  const [speaker, setSpeaker] = useState(initialSpeaker);

  useEffect(() => {
    if (!open) return;
    if (!speakerId) return;

    let mounted = true;
    const fetch = async () => {
      try {
        setLoading(true);
        const res = await getSpeakerById(speakerId);
        if (!mounted) return;
        // API may return nested object or the speaker directly
        const data = res?.speaker || res;
        // Only update if we got meaningful data; otherwise keep initialSpeaker visible
        if (data && Object.keys(data).length > 0) {
          setSpeaker(data);
        }
        // console.log('Speaker details:', res);
      } catch (err) {
        // console.error('Failed to fetch speaker', err);
        // Keep initialSpeaker visible; don't clear on error
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetch();

    return () => {
      mounted = false;
    };
  }, [open, speakerId]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose && onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Keep speaker state in sync if initialSpeaker changes
  useEffect(() => {
    if (initialSpeaker) {
      setSpeaker(initialSpeaker);
    //   console.log('SpeakerModal initialSpeaker set:', initialSpeaker);
    }
  }, [initialSpeaker]);

  // Debug render state
  useEffect(() => {
    if (open) {
    //   console.log('SpeakerModal props:', { speakerId, initialSpeaker });
    //   console.log('SpeakerModal state speaker:', speaker);
    }
  }, [open, speakerId, initialSpeaker, speaker]);

  if (!open) return null;

  // Prioritize initialSpeaker fields, fall back to API speaker data
  const displayData = initialSpeaker || speaker || {};
  const name = displayData?.user_name || displayData?.name || displayData?.firstname || 'Speaker_name';
  const photoUrl = displayData?.user_photo || displayData?.photo_url || displayData?.avatar || displayData?.image;
  const org = displayData?.organisation || displayData?.organization || displayData?.org || displayData?.organizationName || '';
  const desig = displayData?.designation || displayData?.professional_title || displayData?.role || displayData?.position || '';
  const info = [org, desig].filter(Boolean).join(' · ');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} />

      <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 overflow-hidden">
        <div className="flex items-start justify-between p-4 border-b">
          <div />
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 flex gap-6">
          <div className="w-48 h-48 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {photoUrl ? (
              <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-lg text-white bg-gray-400">{(name || 'U').substring(0,2).toUpperCase()}</div>
            )}
          </div>

          <div className="flex-1">
            <h3 className="text-xl font-semibold text-gray-900">{name}</h3>
            {info && <div className="text-sm text-gray-500 mt-1">{info}</div>}
            {(displayData?.country || displayData?.id) && <div className="text-sm text-gray-400 mt-2">{displayData?.country || ''}</div>}

            <div className="mt-4 text-sm text-gray-700 leading-relaxed max-h-56 overflow-y-auto">
              {loading ? <div className="text-gray-500">Loading...</div> : (displayData?.about || displayData?.bio || displayData?.description || '')}
            </div>

            {/* Social Media Links */}
            {displayData?.social_media && Object.keys(displayData.social_media).length > 0 && (
              <div className="mt-4 flex gap-3">
                {displayData.social_media.linkedin && (
                  <a href={displayData.social_media.linkedin} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <Linkedin className="w-5 h-5 text-blue-600" />
                  </a>
                )}
                {displayData.social_media.youtube && (
                  <a href={displayData.social_media.youtube} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <Youtube className="w-5 h-5 text-red-600" />
                  </a>
                )}
                {displayData.social_media.instagram && (
                  <a href={displayData.social_media.instagram} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <Instagram className="w-5 h-5 text-pink-600" />
                  </a>
                )}
                {displayData.social_media.twitter && (
                  <a href={displayData.social_media.twitter} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                    <Twitter className="w-5 h-5 text-blue-400" />
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpeakerModal;
