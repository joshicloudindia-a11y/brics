import React, {useEffect} from 'react';
import { X } from 'lucide-react';

const AttendeesDrawer = ({ open, onClose, title = 'Attendees', attendees = [] }) => {
  // useEffect(() => {
  //   console.log('Attendees data 👉', attendees);
  // }, [attendees]);
  
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black opacity-40" onClick={onClose} />

      <div className="relative ml-auto w-[520px] max-w-full h-full bg-white overflow-y-auto shadow-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-2 rounded hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div>
          {attendees.length === 0 ? (
            <div className="text-sm text-gray-500">No attendees</div>
          ) : (
            <ul className="space-y-4 pb-6">
              {attendees.map((a) => (
                <li key={a._id || a.id} className="flex items-start gap-3 border-b border-gray-100 pb-3">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                    {a.user_photo || a.photo_url || a.avatar ? (
                      <img src={a.user_photo || a.photo_url || a.avatar} alt={a.user_name || a.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white bg-gray-400">{(a.user_name || a.name || 'U').substring(0,2).toUpperCase()}</div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{a.user_name || a.name || 'Unknown'}</div>
                        {(() => {
                          const org = a.organisation || a.organization || a.org || '';
                          const desig = a.designation || a.professional_title || a.role || a.position || '';
                          const info = [org, desig].filter(Boolean).join(' · ');
                          return info ? <div className="text-xs text-gray-500">{info}</div> : null;
                        })()}
                      </div>
                    </div>
                    {a.country && <div className="text-xs text-gray-400 mt-2">{a.country}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AttendeesDrawer;
