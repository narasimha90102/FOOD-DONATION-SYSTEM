import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { Card } from '../../components/Card';
import { Header } from '../../components/Header';
import { BottomNavbar } from '../../components/BottomNavbar';
import { apiClient } from '../../api/client';
import { LocationPicker } from '../../components/LocationPicker';
import { COLORS } from '../../theme/colors';
import { formatISTDateTime } from '../../utils/formatDate';
import { Sparkles, Calendar, ShieldCheck, ShieldAlert, CheckCircle2, RefreshCw } from 'lucide-react-native';

export const CreateDonationScreen = ({ navigation, route }: any) => {
  const { user } = useAuth();
  const donationId = route?.params?.id;

  const [foodName, setFoodName] = useState('');
  const [foodCategory, setFoodCategory] = useState('Veg Meal');
  const [quantity, setQuantity] = useState('10');
  const [unit, setUnit] = useState('Servings');
  const [prepTime, setPrepTime] = useState('');
  const [expTime, setExpTime] = useState('');
  const [address, setAddress] = useState('');
  const [instructions, setInstructions] = useState('');
  const [storageCondition, setStorageCondition] = useState<'ambient' | 'refrigerated' | 'frozen'>('ambient');

  const [lng, setLng] = useState<number | null>(null);
  const [lat, setLat] = useState<number | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Default times (create mode)
  useEffect(() => {
    if (donationId) return;
    const now = new Date();
    const formattedPrep = now.toISOString();
    const formattedExp = new Date(now.getTime() + 12 * 60 * 60 * 1000).toISOString();

    setPrepTime(formattedPrep);
    setExpTime(formattedExp);
  }, [donationId]);

  // Edit mode: fetch details
  useEffect(() => {
    if (!donationId) return;

    const fetchDetails = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get(`/donations/${donationId}`);
        const don = res.data.donation;
        if (don) {
          setFoodName(don.foodName || '');
          setFoodCategory(don.foodCategory || 'Veg Meal');
          setQuantity(don.quantity ? don.quantity.toString() : '10');
          setUnit(don.unit || 'Servings');
          if (don.preparationTime) setPrepTime(don.preparationTime);
          if (don.estimatedExpiryTime) setExpTime(don.estimatedExpiryTime);
          setStorageCondition(don.storageCondition || 'ambient');
          setAddress(don.pickupAddress || '');
          setInstructions(don.specialInstructions || '');
          if (don.coordinates && don.coordinates.length === 2) {
            setLng(don.coordinates[0]);
            setLat(don.coordinates[1]);
          } else if (don.location?.coordinates && don.location.coordinates.length === 2) {
            setLng(don.location.coordinates[0]);
            setLat(don.location.coordinates[1]);
          }
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error fetching food listing details.');
      } finally {
        setLoading(false);
      }
    };

    fetchDetails();
  }, [donationId]);

  // Helpers for editable preparation time and expiry time inputs
  const formatDateTimeForInput = (isoStr: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return isoStr;
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return isoStr;
    }
  };

  const parseInputToIso = (text: string) => {
    if (!text) return '';
    try {
      const formattedText = text.includes('T') ? text : text.replace(' ', 'T');
      const parsed = new Date(formattedText);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
    } catch {}
    return text;
  };

  const handleSubmit = async () => {
    if (!foodName || !quantity || !unit || !address) {
      setError('Please provide all mandatory listing values.');
      return;
    }

    if (lng === null || lat === null || (lng === 0 && lat === 0)) {
      setError('Pickup location coordinates are required. Please search for or pin your exact pickup address on the map.');
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
        storageCondition,
        pickupAddress: address,
        coordinates: [lng, lat],
        specialInstructions: instructions,
        foodImages: ['https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80'],
      };

      if (donationId) {
        await apiClient.put(`/donations/${donationId}`, payload);
        setSuccess('Food listing updated successfully!');
      } else {
        await apiClient.post('/donations', payload);
        setSuccess('Surplus posted successfully! Notified closest NGOs.');
      }

      setTimeout(() => {
        navigation.goBack();
      }, 1200);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error uploading food surplus listing.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.dark900 }}>
      <Header title={donationId ? 'Edit Surplus' : 'Post Surplus Food'} showBack={true} />
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{donationId ? 'Edit Food Surplus Listing' : 'Post Food Surplus'}</Text>
          <Text style={styles.subtitle}>
            {donationId
              ? 'Modify existing surplus details. Changes will automatically update active NGO matching indexes.'
              : 'Input surplus specifications. Our AI will automatically verify biological freshness thresholds.'}
          </Text>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <ShieldAlert size={18} color="#F87171" style={{ marginRight: 8 }} />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {success ? (
          <View style={styles.successBanner}>
            <CheckCircle2 size={18} color="#10B981" style={{ marginRight: 8 }} />
            <Text style={styles.successBannerText}>{success}</Text>
          </View>
        ) : null}

        <Card style={{ margin: 16 }}>
          <Text style={styles.sectionTitle}>Surplus Specifications</Text>

          <Input
            label="Food Surplus Name *"
            placeholder="e.g. Veg Biryani rice servings"
            value={foodName}
            onChangeText={setFoodName}
          />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Food Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
              {['Veg Meal', 'Non-Veg Meal', 'Dry Rations', 'Bakery', 'Fruits', 'Vegetables', 'Other'].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, foodCategory === cat && styles.chipActive]}
                  onPress={() => setFoodCategory(cat)}
                >
                  <Text style={[styles.chipText, foodCategory === cat && styles.chipTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          <Input label="Quantity *" keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
          <Input label="Measuring Unit *" placeholder="e.g. servings, kg, boxes" value={unit} onChangeText={setUnit} />

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Storage Condition</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
              {[
                { id: 'ambient', label: 'Ambient (Room Temp)' },
                { id: 'refrigerated', label: 'Refrigerated' },
                { id: 'frozen', label: 'Frozen' },
              ].map((store) => (
                <TouchableOpacity
                  key={store.id}
                  style={[styles.chip, storageCondition === store.id && styles.chipActive]}
                  onPress={() => setStorageCondition(store.id as any)}
                >
                  <Text style={[styles.chipText, storageCondition === store.id && styles.chipTextActive]}>
                    {store.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Preparation Time Input & Quick Buttons */}
          <View style={styles.inputGroup}>
            <Input
              label="Preparation Time *"
              placeholder="YYYY-MM-DD HH:mm (e.g. 2026-09-01 18:30)"
              value={formatDateTimeForInput(prepTime)}
              onChangeText={(text) => setPrepTime(parseInputToIso(text))}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
              <TouchableOpacity
                style={styles.chip}
                onPress={() => setPrepTime(new Date().toISOString())}
              >
                <Text style={styles.chipText}>Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chip}
                onPress={() => setPrepTime(new Date(Date.now() - 1 * 3600 * 1000).toISOString())}
              >
                <Text style={styles.chipText}>1 hr ago</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chip}
                onPress={() => setPrepTime(new Date(Date.now() - 3 * 3600 * 1000).toISOString())}
              >
                <Text style={styles.chipText}>3 hrs ago</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Expiry Time Input & Quick Buttons */}
          <View style={styles.inputGroup}>
            <Input
              label="Estimated Expiry Time *"
              placeholder="YYYY-MM-DD HH:mm (e.g. 2026-09-02 06:30)"
              value={formatDateTimeForInput(expTime)}
              onChangeText={(text) => setExpTime(parseInputToIso(text))}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
              <TouchableOpacity
                style={styles.chip}
                onPress={() => setExpTime(new Date(Date.now() + 6 * 3600 * 1000).toISOString())}
              >
                <Text style={styles.chipText}>+6 hrs</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chip}
                onPress={() => setExpTime(new Date(Date.now() + 12 * 3600 * 1000).toISOString())}
              >
                <Text style={styles.chipText}>+12 hrs</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chip}
                onPress={() => setExpTime(new Date(Date.now() + 24 * 3600 * 1000).toISOString())}
              >
                <Text style={styles.chipText}>+24 hrs</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.chip}
                onPress={() => setExpTime(new Date(Date.now() + 48 * 3600 * 1000).toISOString())}
              >
                <Text style={styles.chipText}>+48 hrs</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          {/* Pickup Location Selection (Matching Web 100%) */}
          <Text style={styles.sectionTitleAlt}>Pickup Location Selection</Text>

          <LocationPicker
            label="Pickup Location"
            initialAddress={address}
            initialCoordinates={lng !== null && lat !== null ? [lng, lat] : undefined}
            onChange={({ address: newAddr, coordinates }) => {
              setAddress(newAddr);
              setLng(coordinates[0]);
              setLat(coordinates[1]);
            }}
          />

          <Input
            label="Building / Location Pickup Instructions"
            placeholder="e.g. Building A, 2nd floor, entry via back gate near landmark..."
            value={instructions}
            onChangeText={setInstructions}
            multiline
          />

          <View style={{ marginTop: 16 }}>
            <Button
              title={
                loading
                  ? donationId
                    ? 'Updating details...'
                    : 'Redistributing surplus...'
                  : donationId
                  ? 'Save Changes'
                  : 'Submit Food Donation Listing'
              }
              onPress={handleSubmit}
            />
          </View>
        </Card>

        <View style={{ height: 20 }} />
      </ScrollView>
      <BottomNavbar activeTab="action" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.dark900,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.25)',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
  },
  errorBannerText: {
    color: '#F87171',
    fontSize: 12,
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
    padding: 12,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 10,
  },
  successBannerText: {
    color: '#10B981',
    fontSize: 12,
    flex: 1,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  sectionTitleAlt: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 16,
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  chipText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chipTextActive: {
    color: '#0F172A',
  },
  dateTimeContainer: {
    marginVertical: 6,
  },
  dateTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  dateTimeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  dateTimeBadgeAlt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 4,
  },
  dateTimeTextAlt: {
    color: '#F59E0B',
    fontSize: 12,
    fontWeight: 'bold',
  },
  submitBtn: {
    marginTop: 16,
  },
  aiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  aiBadgeText: {
    color: '#10B981',
    fontSize: 10,
    fontWeight: 'bold',
  },
  aiLoading: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiLoadingText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 8,
  },
  aiErrorBox: {
    backgroundColor: 'rgba(248, 113, 113, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.25)',
    padding: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  aiErrorTitle: {
    color: '#F87171',
    fontSize: 13,
    fontWeight: 'bold',
  },
  aiErrorText: {
    color: '#CBD5E1',
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
  retryBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginTop: 12,
  },
  retryBtnText: {
    color: '#0F172A',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  aiResultContent: {
    marginVertical: 8,
  },
  aiScoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    paddingBottom: 16,
    marginBottom: 12,
  },
  aiScoreBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 2,
    borderColor: '#10B981',
  },
  aiScoreVal: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
  },
  aiScoreSub: {
    color: '#94A3B8',
    fontSize: 9,
    textTransform: 'uppercase',
  },
  aiMetricsCol: {
    justifyContent: 'center',
  },
  aiMetricLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  aiMetricVal: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 2,
  },
  riskBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  riskBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  recommendationBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 10,
  },
  recTitle: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  recText: {
    color: '#94A3B8',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 16,
  },
});
