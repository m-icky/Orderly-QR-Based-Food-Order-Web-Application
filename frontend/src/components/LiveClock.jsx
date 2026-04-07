import { useState, useEffect } from 'react';

export default function LiveClock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const options = { 
    weekday: 'short', 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric',
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit'
  };
  
  return (
    <div className="text-sm font-medium text-gray-500 bg-white/60 px-3 py-1.5 rounded-lg border border-gray-100 shadow-sm">
      {time.toLocaleDateString('en-US', options)}
    </div>
  );
}
