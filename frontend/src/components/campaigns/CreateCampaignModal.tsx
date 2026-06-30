import { useState, FormEvent, useMemo } from 'react';
import { useCreateCampaign } from '../../hooks/useCampaigns';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Country, State, City } from 'country-state-city';

interface CreateCampaignModalProps {
  onClose: () => void;
}

export default function CreateCampaignModal({ onClose }: CreateCampaignModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  
  const [countryCode, setCountryCode] = useState('IN');
  const [stateCode, setStateCode] = useState('');
  const [cityName, setCityName] = useState('');

  const [minRating, setMinRating] = useState(3.5);
  const [minReviews, setMinReviews] = useState(10);
  const [includeWebsites, setIncludeWebsites] = useState(true);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);

  const createCampaign = useCreateCampaign();

  const countries = useMemo(() => Country.getAllCountries(), []);
  const states = useMemo(() => State.getStatesOfCountry(countryCode), [countryCode]);
  const cities = useMemo(() => City.getCitiesOfState(countryCode, stateCode), [countryCode, stateCode]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    const country = Country.getCountryByCode(countryCode)?.name || 'India';
    let locationString = cityName;
    if (!locationString) {
      locationString = State.getStateByCodeAndCountry(stateCode, countryCode)?.name || country;
    }

    await createCampaign.mutateAsync({
      name: name || `${category} in ${locationString}`,
      category,
      city: locationString,
      country,
      filters: {
        minRating,
        minReviews,
        excludeWithWebsite: !includeWebsites,
      },
      schedule: {
        enabled: scheduleEnabled,
        cronExpression: '0 8 * * *',
      },
    } as never);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-lg glass-card p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">New Campaign</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-800 text-surface-300 transition-colors">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-200 mb-1.5">Campaign Name (Optional)</label>
            <input
              className="input-field"
              placeholder="e.g., Plumbers in Delhi"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-200 mb-1.5">Category *</label>
            <input
              className="input-field"
              placeholder="e.g., plumber, dentist, coffee shop"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-200 mb-1.5">Country *</label>
              <select
                className="input-field"
                value={countryCode}
                onChange={(e) => {
                  setCountryCode(e.target.value);
                  setStateCode('');
                  setCityName('');
                }}
                required
              >
                {countries.map(c => (
                  <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-surface-200 mb-1.5">State (Optional)</label>
              <select
                className="input-field"
                value={stateCode}
                onChange={(e) => {
                  setStateCode(e.target.value);
                  setCityName('');
                }}
                disabled={states.length === 0}
              >
                <option value="">All States</option>
                {states.map(s => (
                  <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-200 mb-1.5">City (Optional)</label>
            <select
              className="input-field"
              value={cityName}
              onChange={(e) => setCityName(e.target.value)}
              disabled={cities.length === 0}
            >
              <option value="">All Cities</option>
              {cities.map(c => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-200 mb-1.5">
                Min Rating: {minRating}
              </label>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="w-full accent-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-200 mb-1.5">Min Reviews</label>
              <input
                type="number"
                className="input-field"
                value={minReviews}
                onChange={(e) => setMinReviews(Number(e.target.value))}
                min={0}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-800/50">
            <div>
              <p className="text-sm font-medium text-surface-200">Include Businesses with Websites</p>
              <p className="text-xs text-surface-300">If on, AI will score website quality</p>
            </div>
            <button
              type="button"
              onClick={() => setIncludeWebsites(!includeWebsites)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                includeWebsites ? 'bg-brand-500' : 'bg-surface-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  includeWebsites ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Schedule Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface-800/50">
            <div>
              <p className="text-sm font-medium text-surface-200">Daily Auto-Search</p>
              <p className="text-xs text-surface-300">Run automatically at 8 AM IST</p>
            </div>
            <button
              type="button"
              onClick={() => setScheduleEnabled(!scheduleEnabled)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                scheduleEnabled ? 'bg-brand-500' : 'bg-surface-700'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  scheduleEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancel
            </button>
            <button
              type="submit"
              disabled={createCampaign.isPending}
              className="btn-primary flex-1"
            >
              {createCampaign.isPending ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
