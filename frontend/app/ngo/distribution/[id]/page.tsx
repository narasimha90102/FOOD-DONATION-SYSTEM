"use client";

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ApiService } from '../../../../services/api';
import { useAppStore } from '../../../../store/useAppStore';
import { InputWithIcon } from '../../../../components/InputWithIcon';
import { Sparkles, MapPin, CheckCircle2, RefreshCw, Compass } from 'lucide-react';
import Link from 'next/link';

interface Props {
  params: Promise<{ id: string }>;
}

export default function NgoDistributionPage({ params }: Props) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;
  const router = useRouter();
  const { user } = useAppStore();

  const [donation, setDonation] = useState<any>(null);
  const [distributedQuantity, setDistributedQuantity] = useState('');
  const [beneficiariesCount, setBeneficiariesCount] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchDonationDetails = async () => {
    try {
      const res = await ApiService.get(`/donations/${id}`);
      setDonation(res.donation);
      setDistributedQuantity(res.donation.quantity.toString());
      setLocation(res.donation.pickupAddress || 'Local NGO Center Hub');
    } catch (err: any) {
      setError(err.message || 'Error fetching donation details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonationDetails();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!distributedQuantity || !beneficiariesCount || !location) {
      setError('Please provide all mandatory distribution fields.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        distributedQuantity: Number(distributedQuantity),
        beneficiariesCount: Number(beneficiariesCount),
        location,
        notes,
      };

      await ApiService.put(`/donations/${id}/distribute`, payload);
      setSuccess('Distribution successfully logged! Donation closed.');

      setTimeout(() => {
        router.push('/ngo');
      }, 1500);

    } catch (err: any) {
      setError(err.message || 'Error submitting distribution logs.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-grow flex flex-col items-center justify-center py-20 text-center">
        <RefreshCw className="h-8 w-8 text-brand-500 animate-spin mb-4" />
        <p className="text-slate-400">Loading donation details...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col gap-8">
      
      <div className="border-b border-white/5 pb-4">
        <h1 className="text-3xl font-bold text-white text-outfit">Log Food Distribution</h1>
        <p className="text-slate-400 text-sm mt-1">Specify how the claimed food surplus was distributed to local beneficiaries.</p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/25 p-3.5 rounded-lg text-xs text-red-400">
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="bg-brand-500/10 border border-brand-500/25 p-3.5 rounded-lg flex items-center gap-2.5 text-xs text-brand-500">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Distribution form */}
        <form onSubmit={handleSubmit} className="md:col-span-2 glass-panel p-8 border-white/5 space-y-6">
          <h3 className="text-lg font-bold text-white text-outfit">Distribution Specs</h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <InputWithIcon
              type="number"
              step="0.1"
              id="distribute-qty"
              label="Quantity Distributed"
              value={distributedQuantity}
              onChange={(e) => setDistributedQuantity(e.target.value)}
              required
              disabled={submitting}
            />

            <InputWithIcon
              type="number"
              id="distribute-beneficiaries"
              label="Beneficiaries Served"
              placeholder="e.g. 45 people"
              value={beneficiariesCount}
              onChange={(e) => setBeneficiariesCount(e.target.value)}
              required
              disabled={submitting}
            />
          </div>

          <InputWithIcon
            type="text"
            id="distribute-location"
            label="Distribution Address / Site"
            placeholder="e.g. Community Shelter Hub"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            icon={MapPin}
            required
            disabled={submitting}
          />

          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">Distribution Notes</label>
            <textarea
              rows={4}
              placeholder="Notes on the distribution experience or state of food..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full glass-input resize-none"
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-brand-500 hover:bg-brand-600 disabled:bg-brand-500/50 text-dark-900 font-bold py-3.5 rounded-lg transition-all flex items-center justify-center gap-2 text-sm shadow-lg"
          >
            {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            <span>{submitting ? 'Submitting Details...' : 'Complete Distribution & Archive'}</span>
          </button>
        </form>

        {/* Claim Info Details Card */}
        <div className="flex flex-col gap-6">
          <div className="glass-panel p-6 border-white/5 space-y-4">
            <h4 className="text-base font-bold text-white text-outfit">Claim Summary</h4>
            
            {donation && (
              <div className="space-y-4 text-xs">
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[9px]">Food Name</span>
                  <span className="text-white font-semibold block mt-0.5">{donation.foodName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[9px]">Original Quantity</span>
                  <span className="text-white font-semibold block mt-0.5">{donation.quantity} {donation.unit}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[9px]">Donor Center</span>
                  <span className="text-white font-semibold block mt-0.5">{donation.donor?.name}</span>
                </div>
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[9px]">Storage Condition</span>
                  <span className="text-white font-semibold block mt-0.5 capitalize">{donation.storageCondition}</span>
                </div>
                <div className="bg-brand-500/5 border border-brand-500/25 p-3 rounded-lg text-brand-500 text-[10px]">
                  <strong>Redirection Cycle Complete:</strong> After completing the distribution log, the donor's trust index and carbon credits will automatically update.
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
