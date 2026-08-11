"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiService } from '../../../services/api';
import { useAppStore } from '../../../store/useAppStore';
import { InputWithIcon } from '../../../components/InputWithIcon';
import { Sparkles, Calendar, MapPin, Navigation, ShieldCheck, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react';
import LocationPicker from '../../../components/LocationPicker';
import confetti from 'canvas-confetti';
import { formatDateTime } from '../../../utils/formatDate';

export default function DonatePage() {
  const router = useRouter();
  const { user } = useAppStore();

  const [id, setId] = useState<string | null>(null);

  const [foodName, setFoodName] = useState('');
  const [foodCategory, setFoodCategory] = useState('Veg Meal');
  const [quantity, setQuantity] = useState('10');
  const [unit, setUnit] = useState('Servings');
  const [prepTime, setPrepTime] = useState('');
  const [expTime, setExpTime] = useState('');
  const [storage, setStorage] = useState<'ambient' | 'refrigerated' | 'frozen'>('ambient');
  const [address, setAddress] = useState('');
  // Coordinates are stored as strings for form submission
  // null means no GPS yet obtained — let LocationPicker auto-trigger GPS
  const [lng, setLng] = useState<string | null>(null);
  const [lat, setLat] = useState<string | null>(null);
  const [instructions, setInstructions] = useState('');

  // AI Predict variables
  const [aiPredict, setAiPredict] = useState<any>(null);
  const [checkingAi, setCheckingAi] = useState(false);
  const [aiError, setAiError] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [minDateTime, setMinDateTime] = useState('');

  const [showExpiryModal, setShowExpiryModal] = useState(false);
  const [tempExpTime, setTempExpTime] = useState('');
  const [modalError, setModalError] = useState('');

  const handleExpiryConfirm = () => {
    if (!tempExpTime) {
      setModalError('Please select a valid date and time.');
      return;
    }

    const selectedTime = new Date(tempExpTime).getTime();
    const currentTime = Date.now();

    if (selectedTime <= currentTime) {
      setModalError('Estimated expiry time must be later than the current time.');
      return;
    }

    setExpTime(tempExpTime);
    setShowExpiryModal(false);
    setModalError('');
  };

  const openExpiryModal = () => {
    setTempExpTime(expTime || '');
    setModalError('');
    setShowExpiryModal(true);
  };

  useEffect(() => {
    const updateMinDateTime = () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      setMinDateTime(`${year}-${month}-${day}T${hours}:${minutes}`);
    };

    updateMinDateTime();
    const interval = setInterval(updateMinDateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Extract ID on client side
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlId = params.get('id');
      if (urlId) {
        setId(urlId);
      }
    }
  }, []);

  // Fetch details in edit mode
  useEffect(() => {
    if (!id) return;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await ApiService.get(`/donations/${id}`);
        const don = res.donation;
        if (don) {
          setFoodName(don.foodName || '');
          setFoodCategory(don.foodCategory || 'Veg Meal');
          setQuantity(don.quantity ? don.quantity.toString() : '10');
          setUnit(don.unit || 'Servings');
          
          if (don.preparationTime) {
            setPrepTime(new Date(don.preparationTime).toISOString().slice(0, 16));
          }
          if (don.estimatedExpiryTime) {
            const expStr = new Date(don.estimatedExpiryTime).toISOString().slice(0, 16);
            setExpTime(expStr);
            setTempExpTime(expStr);
          }
          setStorage(don.storageCondition || 'ambient');
          setAddress(don.pickupAddress || '');
          if (don.location?.coordinates && don.location.coordinates.length === 2) {
            setLng(don.location.coordinates[0].toString());
            setLat(don.location.coordinates[1].toString());
          }
          setInstructions(don.specialInstructions || '');
        }
      } catch (err: any) {
        setError(err.message || 'Error fetching food listing details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [id]);

  // Set default times on mount (create mode only)
  useEffect(() => {
    if (id) return;
    const now = new Date();
    const formattedPrep = now.toISOString().slice(0, 16); // yyyy-MM-ddThh:mm
    const formattedExp = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString().slice(0, 16); // +12 hours
    
    setPrepTime(formattedPrep);
    setExpTime(formattedExp);
    setTempExpTime(formattedExp);
    // Default address from user profile if available — NOT a hardcoded fallback
    if (user?.address) {
      setAddress(user.address);
    }
    // Coordinates in create mode start as null — LocationPicker will call GPS automatically
  }, [user, id]);

  // Run AI predictor dynamically when inputs change
  useEffect(() => {
    if (foodCategory && prepTime && expTime && storage) {
      triggerAIPrediction();
    }
  }, [foodCategory, prepTime, expTime, storage]);

  const triggerAIPrediction = async () => {
    try {
      setCheckingAi(true);
      setAiError('');
      const prediction = await ApiService.post('/ai/predict', {
        foodCategory,
        preparationTime: new Date(prepTime),
        estimatedExpiryTime: new Date(expTime),
        storageCondition: storage,
      });

      setAiPredict(prediction.prediction);
    } catch (err: any) {
      console.error('[AI Predict Error] Ollama service down:', err);
      setAiError(err.message || 'Local AI service is unavailable. Please start Ollama.');
      setAiPredict(null);
    } finally {
      setCheckingAi(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName || !foodCategory || !quantity || !unit || !prepTime || !expTime || !address) {
      setError('Please provide all mandatory listing values.');
      return;
    }

    const now = new Date();
    const expiryDate = new Date(expTime);
    if (expiryDate <= now) {
      setError('Estimated expiry time must be later than the current time.');
      return;
    }

    // ── CRITICAL: Block submission if GPS coordinates have not been obtained ──
    const parsedLng = lng !== null ? Number(lng) : null;
    const parsedLat = lat !== null ? Number(lat) : null;

    if (
      parsedLng === null || parsedLat === null ||
      isNaN(parsedLng) || isNaN(parsedLat) ||
      (parsedLng === 0 && parsedLat === 0)
    ) {
      setError(
        'Pickup location coordinates are required. Please allow location access, or search for and pin your exact pickup address on the map before submitting.'
      );
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        foodName,
        foodCategory,
        quantity: Number(quantity),
        unit,
        preparationTime: new Date(prepTime),
        estimatedExpiryTime: new Date(expTime),
        storageCondition: storage,
        pickupAddress: address,
        // Use validated, non-zero coordinates — parsedLng/parsedLat are guaranteed valid here
        coordinates: [parsedLng, parsedLat],
        specialInstructions: instructions,
        foodImages: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'],
      };

      if (id) {
        await ApiService.put(`/donations/${id}`, payload);
        setSuccess('Food listing updated successfully!');
      } else {
        await ApiService.post('/donations', payload);
        setSuccess('Surplus posted successfully! Notified closest NGOs.');
      }
      
      // Dynamic Points Confetti Reward visual
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#10b981', '#059669', '#34d399', '#f59e0b']
      });

      setTimeout(() => {
        router.push(user?.role === 'ADMIN' ? '/admin/donations' : '/donor');
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Error uploading food surplus listing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-8">
      
      <div className="border-b border-white/5 pb-4">
        <h1 className="text-3xl font-bold text-white text-outfit">
          {id ? 'Edit Food Surplus Listing' : 'Post Food Surplus'}
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          {id 
            ? 'Modify existing surplus details. Changes will automatically update active NGO matching indexes.' 
            : 'Input surplus specifications. Our AI will automatically verify biological freshness thresholds.'}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/25 p-3.5 rounded-lg flex items-center gap-2.5 text-xs text-red-400">
          <ShieldAlert className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-brand-500/10 border border-brand-500/25 p-3.5 rounded-lg flex items-center gap-2.5 text-xs text-brand-500">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Form panel (Takes 2 cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 glass-panel p-8 border-white/5 space-y-6">
          <h3 className="text-lg font-bold text-white text-outfit">Surplus Specifications</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InputWithIcon
              type="text"
              id="donate-foodname"
              label="Food Surplus Name"
              placeholder="e.g. Veg Biryani rice servings"
              value={foodName}
              onChange={(e) => setFoodName(e.target.value)}
              icon={Sparkles}
              required
              disabled={loading}
            />

            <div>
              <label htmlFor="donate-category" className="text-xs font-bold text-slate-400 block mb-1">Food Category</label>
              <select
                id="donate-category"
                value={foodCategory}
                onChange={(e) => setFoodCategory(e.target.value)}
                className="w-full glass-input"
              >
                <option value="Veg Meal">Veg Meal</option>
                <option value="Non-Veg Meal">Non-Veg Meal</option>
                <option value="Dry Rations">Dry Rations</option>
                <option value="Bakery">Bakery</option>
                <option value="Fruits">Fruits</option>
                <option value="Vegetables">Vegetables</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <InputWithIcon
              type="number"
              step="0.1"
              id="donate-quantity"
              label="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              disabled={loading}
            />

            <InputWithIcon
              type="text"
              id="donate-unit"
              label="Measuring Unit"
              placeholder="e.g. servings, kg, boxes"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              required
              disabled={loading}
            />

            <div>
              <label htmlFor="donate-storage" className="text-xs font-bold text-slate-400 block mb-1">Storage Condition</label>
              <select
                id="donate-storage"
                value={storage}
                onChange={(e) => setStorage(e.target.value as any)}
                className="w-full glass-input"
              >
                <option value="ambient">Ambient (Room Temp)</option>
                <option value="refrigerated">Refrigerated</option>
                <option value="frozen">Frozen</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InputWithIcon
              type="datetime-local"
              id="donate-preptime"
              label="Preparation Time"
              value={prepTime}
              onChange={(e) => setPrepTime(e.target.value)}
              icon={Calendar}
              required
              disabled={loading}
            />

            <div onClick={openExpiryModal} className="cursor-pointer">
              <InputWithIcon
                type="text"
                id="donate-exptime"
                label="Estimated Expiry Time"
                value={expTime ? formatDateTime(expTime) : ''}
                readOnly
                placeholder="Click to select expiry date & time..."
                icon={Calendar}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="border-t border-white/5 pt-6 space-y-4">
            <span className="text-brand-500 text-xs font-bold uppercase tracking-wider block">Pickup Location Selection</span>
            
            <LocationPicker
              initialAddress={address}
              // In edit mode pass saved coordinates; in create mode pass nothing so GPS auto-triggers
              initialCoordinates={
                lng !== null && lat !== null
                  ? [Number(lng), Number(lat)]
                  : undefined
              }
              onChange={({ address: newAddr, coordinates }) => {
                setAddress(newAddr);
                setLng(coordinates[0].toString());
                setLat(coordinates[1].toString());
              }}
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">Special Instructions</label>
            <textarea
              rows={3}
              placeholder="e.g. Keep separate, bring boxes for pickup..."
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full glass-input resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-dark-900 font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-md shadow-xl hover:shadow-brand-500/20"
          >
            {loading ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
            <span>{loading ? (id ? 'Updating details...' : 'Redistributing surplus...') : (id ? 'Save Changes' : 'Submit Food Donation Listing')}</span>
          </button>
        </form>

        {/* AI Predict Panel (Takes 1 col) */}
        <div className="flex flex-col gap-6">
          <div className="border-b border-white/5 pb-2">
            <h3 className="text-lg font-bold text-white text-outfit">AI Freshness Engine</h3>
          </div>

          <div className="glass-panel p-6 border-white/5 flex flex-col gap-6">
            
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-xs font-semibold">Microbiological Freshness</span>
              <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> AI Core
              </span>
            </div>

            {checkingAi ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                <RefreshCw className="h-6 w-6 text-brand-500 animate-spin" />
                <span className="text-xs text-slate-500">Checking microbial growth rates...</span>
              </div>
            ) : aiError ? (
              <div className="bg-red-500/10 border border-red-500/25 p-4 rounded-xl flex flex-col gap-2 text-red-400 text-xs text-left leading-relaxed">
                <div className="flex items-center gap-2 font-bold">
                  <ShieldAlert className="h-4.5 w-4.5 shrink-0" />
                  <span>AI Verification Unavailable</span>
                </div>
                <p className="text-slate-300">{aiError}</p>
                <button
                  type="button"
                  onClick={triggerAIPrediction}
                  className="mt-2 w-full bg-red-500/15 hover:bg-red-500/25 border border-red-500/20 text-red-300 font-bold py-2 rounded-lg text-[10px] uppercase transition-colors"
                >
                  Retry Scan
                </button>
              </div>
            ) : aiPredict ? (
              <div className="flex flex-col gap-6 text-center">
                
                {/* Circular Freshness Indicator */}
                <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
                  
                  {/* SVG progress circle */}
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="72" cy="72" r="64" className="stroke-white/5 fill-none" strokeWidth="8" />
                    <circle
                      cx="72"
                      cy="72"
                      r="64"
                      className={`fill-none transition-all duration-500 ${
                        aiPredict.aiRiskLevel === 'danger' ? 'stroke-red-500' :
                        aiPredict.aiRiskLevel === 'warning' ? 'stroke-amber-500' : 'stroke-brand-500'
                      }`}
                      strokeWidth="8"
                      strokeDasharray={402}
                      strokeDashoffset={402 - (402 * aiPredict.aiFreshnessScore) / 100}
                    />
                  </svg>
                  
                  <div className="absolute flex flex-col">
                    <span className="text-3xl font-extrabold text-white text-outfit">{aiPredict.aiFreshnessScore}%</span>
                    <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Freshness</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-b border-white/5 py-4 my-2 text-left">
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Safe window</span>
                    <span className="text-base font-bold text-white mt-0.5">{aiPredict.aiSafeWindowHours} Hours</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Risk Code</span>
                    <span className={`text-xs font-bold uppercase mt-1 w-fit px-1.5 py-0.5 rounded ${
                      aiPredict.aiRiskLevel === 'danger' ? 'bg-red-500/10 text-red-400' :
                      aiPredict.aiRiskLevel === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-brand-500/10 text-brand-500'
                    }`}>
                      {aiPredict.aiRiskLevel}
                    </span>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-xs text-left leading-relaxed text-slate-300">
                  <strong>AI Storage Recommendation:</strong> <br />
                  <span className="text-slate-400 block mt-1">{aiPredict.aiRecommendation}</span>
                </div>

              </div>
            ) : (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                <ShieldCheck className="h-10 w-10 text-slate-500" />
                <span className="text-xs text-slate-500">Provide preparation & expiry values to evaluate freshness indexes.</span>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* Custom Expiry picker modal with OK confirmation */}
      {showExpiryModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="w-full max-w-md glass-panel p-6 border-white/10 shadow-2xl space-y-5 text-left animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-lg font-bold text-white text-outfit">Set Estimated Expiry Time</h3>
              <p className="text-xs text-slate-400 mt-1">
                Surplus listing availability must be set strictly in the future.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expiry Date & Time</label>
                <input
                  type="datetime-local"
                  min={minDateTime}
                  value={tempExpTime}
                  onChange={(e) => {
                    setTempExpTime(e.target.value);
                    setModalError('');
                  }}
                  className="w-full glass-input text-white focus:border-brand-500 text-sm"
                  style={{
                    colorScheme: 'dark',
                  }}
                />
              </div>

              {modalError && (
                <div className="text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg flex items-center gap-2">
                  <ShieldAlert className="h-4 w-4 shrink-0 text-red-400" />
                  <span>{modalError}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowExpiryModal(false);
                  setModalError('');
                }}
                className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all text-sm font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExpiryConfirm}
                className="px-4 py-2 rounded-lg bg-brand-500 text-dark-900 hover:bg-brand-600 transition-all text-sm font-bold shadow-lg hover:shadow-brand-500/20"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
