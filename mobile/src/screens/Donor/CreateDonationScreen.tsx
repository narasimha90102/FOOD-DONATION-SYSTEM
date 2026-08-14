import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { Header } from '../../components/Header';
import { Input } from '../../components/Input';
import { Button } from '../../components/Button';
import { donationApi } from '../../api/donations';

export const CreateDonationScreen = ({ navigation }: any) => {
  const [foodTitle, setFoodTitle] = useState('');
  const [foodType, setFoodType] = useState('Cooked Meal');
  const [quantityKg, setQuantityKg] = useState('10');
  const [servings, setServings] = useState('30');
  const [expiryHours, setExpiryHours] = useState('6');
  const [pickupAddress, setPickupAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!foodTitle || !pickupAddress) {
      Alert.alert('Required Fields', 'Please enter food title and pickup address');
      return;
    }
    try {
      setLoading(true);
      await donationApi.create({
        foodTitle,
        foodType,
        quantityKg: parseFloat(quantityKg) || 1,
        servings: parseInt(servings, 10) || 1,
        expiryHours: parseInt(expiryHours, 10) || 4,
        pickupAddress,
        notes,
      });
      Alert.alert('Success', 'Surplus food donation submitted successfully!', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to submit food donation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Donate Food" subtitle="Post surplus food for nearby NGOs & Volunteers" showLogout={false} />

      <ScrollView contentContainerStyle={styles.content}>
        <Input label="Food Title / Description *" placeholder="e.g. Fresh Rice & Dal Meals" value={foodTitle} onChangeText={setFoodTitle} />
        <Input label="Food Category" placeholder="Cooked Meal / Bakery / Raw Produce" value={foodType} onChangeText={setFoodType} />
        <Input label="Quantity (in Kg)" placeholder="10" keyboardType="numeric" value={quantityKg} onChangeText={setQuantityKg} />
        <Input label="Estimated Servings" placeholder="30" keyboardType="numeric" value={servings} onChangeText={setServings} />
        <Input label="Freshness / Expiry (Hours)" placeholder="6" keyboardType="numeric" value={expiryHours} onChangeText={setExpiryHours} />
        <Input label="Pickup Address *" placeholder="123 Community Hub St, Sector 4" value={pickupAddress} onChangeText={setPickupAddress} multiline />
        <Input label="Special Instructions / Allergens" placeholder="Packaged in disposable foil containers" value={notes} onChangeText={setNotes} multiline />

        <Button title="Submit Food Donation" onPress={handleSubmit} loading={loading} style={styles.submitBtn} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 16,
  },
  submitBtn: {
    marginTop: 16,
    marginBottom: 32,
  },
});
