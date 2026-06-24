import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  ActivityIndicator, TextInput, Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { logActivity, getDistance, geocodeSearch, analyzeScenario } from '../../api/api';
import { showAlert } from '../../utils/crossAlert';
import { Spacing } from '../../theme';
import { useAppTheme, buildC } from '../../context/ThemeContext';
import { useHaptics } from '../../hooks/useHaptics';
import EcoConfetti from '../../components/EcoConfetti';

// ─────────────────────────────────────────────────────────────────────────────
// DATA — categories, types and scenarios
// ─────────────────────────────────────────────────────────────────────────────


const CATEGORIES = [
  {
    id: 'transport', icon: '🚗', label: 'Transport',
    grad: ['#1565C0', '#0D47A1'],
    options: [
      {
        id: 'car_petrol', label: 'Car — Petrol', icon: '🚗', group: 'Car',
        baseEF: 0.21, unit: 'km',
        scenarios: [
          { id: 'solo',       label: 'Solo Driver',       icon: '👤', efMult: 1.0,   note: 'Only you in the car' },
          { id: 'cp2',        label: 'Shared · 2 people', icon: '👥', efMult: 0.5,   note: 'CO₂ split between 2' },
          { id: 'cp3',        label: 'Shared · 3 people', icon: '🫂', efMult: 0.333, note: 'CO₂ split between 3' },
          { id: 'cp4',        label: 'Shared · 4 people', icon: '👨‍👩‍👧‍👦', efMult: 0.25,  note: 'CO₂ split between 4' },
          { id: 'rideshare',  label: 'Rideshare / Taxi',  icon: '🚕', efMult: 0.6,   note: 'Ride-hailing service' },
          { id: 'custom_text', label: 'Describe My Case', icon: '💬', isCustomText: true, note: 'AI-powered analysis' },
        ],
      },
      {
        id: 'car_diesel', label: 'Car — Diesel', icon: '🚙', group: 'Car',
        baseEF: 0.17, unit: 'km',
        scenarios: [
          { id: 'solo',       label: 'Solo Driver',       icon: '👤', efMult: 1.0 },
          { id: 'cp2',        label: 'Shared · 2 people', icon: '👥', efMult: 0.5 },
          { id: 'cp3',        label: 'Shared · 3 people', icon: '🫂', efMult: 0.333 },
          { id: 'cp4',        label: 'Shared · 4 people', icon: '👨‍👩‍👧‍👦', efMult: 0.25 },
          { id: 'custom_text', label: 'Describe My Case', icon: '💬', isCustomText: true, note: 'AI-powered analysis' },
        ],
      },
      {
        id: 'car_electric', label: 'Car — Electric', icon: '🔋', group: 'Car',
        baseEF: 0.05, unit: 'km',
        scenarios: [
          { id: 'grid',       label: 'Grid Charged',       icon: '🔌', efMult: 1.0 },
          { id: 'renewable',  label: 'Renewable Charged',  icon: '☀️', efMult: 0.3, note: 'Solar/wind source' },
          { id: 'cp2',        label: 'Shared · 2 people',  icon: '👥', efMult: 0.5 },
          { id: 'custom_text', label: 'Describe My Case', icon: '💬', isCustomText: true, note: 'AI-powered analysis' },
        ],
      },
      {
        id: 'car_hybrid', label: 'Car — Hybrid', icon: '⚡', group: 'Car',
        baseEF: 0.11, unit: 'km',
        scenarios: [
          { id: 'solo',       label: 'Solo Driver',       icon: '👤', efMult: 1.0 },
          { id: 'cp2',        label: 'Shared · 2 people', icon: '👥', efMult: 0.5 },
          { id: 'cp3',        label: 'Shared · 3 people', icon: '🫂', efMult: 0.333 },
          { id: 'custom_text', label: 'Describe My Case', icon: '💬', isCustomText: true, note: 'AI-powered analysis' },
        ],
      },
      {
        id: 'car_suv_petrol', label: 'SUV — Petrol', icon: '🚙', group: 'Car',
        baseEF: 0.28, unit: 'km',
        scenarios: [
          { id: 'solo',       label: 'Solo Driver',       icon: '👤', efMult: 1.0 },
          { id: 'cp2',        label: 'Shared · 2 people', icon: '👥', efMult: 0.5 },
          { id: 'cp3',        label: 'Shared · 3 people', icon: '🫂', efMult: 0.333 },
          { id: 'cp4',        label: 'Shared · 4 people', icon: '👨‍👩‍👧‍👦', efMult: 0.25 },
          { id: 'cp5',        label: 'Shared · 5 people', icon: '🧑‍🤝‍🧑', efMult: 0.2 },
          { id: 'custom_text', label: 'Describe My Case', icon: '💬', isCustomText: true, note: 'AI-powered analysis' },
        ],
      },
      { id: 'car_suv_diesel', label: 'SUV — Diesel', icon: '🚙', group: 'Car', baseEF: 0.22, unit: 'km',
        scenarios: [
          { id: 'solo',       label: 'Solo',             icon: '👤', efMult: 1.0 },
          { id: 'cp2',        label: 'Shared · 2',       icon: '👥', efMult: 0.5 },
          { id: 'cp3',        label: 'Shared · 3',       icon: '🫂', efMult: 0.333 },
          { id: 'custom_text', label: 'Describe My Case', icon: '💬', isCustomText: true, note: 'AI-powered' },
        ],
      },
      { id: 'car_van', label: 'Van / Minibus', icon: '🚐', group: 'Car', baseEF: 0.20, unit: 'km',
        scenarios: [
          { id: 'solo',       label: 'Solo',             icon: '👤', efMult: 1.0 },
          { id: 'cp2',        label: 'Shared · 2–4',     icon: '👥', efMult: 0.35 },
          { id: 'cp_big',     label: 'Full Van (7–9)',    icon: '🚐', efMult: 0.14 },
          { id: 'custom_text', label: 'Describe My Case', icon: '💬', isCustomText: true, note: 'AI-powered' },
        ],
      },
      { id: 'motorcycle', label: 'Motorcycle', icon: '🏍️', baseEF: 0.114, unit: 'km' },
      { id: 'bus',        label: 'Bus',        icon: '🚌', baseEF: 0.089, unit: 'km' },
      { id: 'train',      label: 'Train / Metro', icon: '🚂', baseEF: 0.041, unit: 'km' },
      {
        id: 'flight_domestic', label: 'Flight (Domestic)', icon: '✈️', group: 'Flight',
        baseEF: 0.255, unit: 'km',
        scenarios: [
          { id: 'economy',  label: 'Economy Class',  icon: '💺', efMult: 1.0,  note: 'Standard seat' },
          { id: 'business', label: 'Business Class', icon: '🛋️', efMult: 2.9,  note: 'Larger footprint per seat' },
          { id: 'first',    label: 'First Class',    icon: '👑', efMult: 4.0,  note: 'Highest per-pax share' },
        ],
      },
      {
        id: 'flight_international', label: 'Flight (International)', icon: '🛫', group: 'Flight',
        baseEF: 0.195, unit: 'km',
        scenarios: [
          { id: 'economy',  label: 'Economy Class',  icon: '💺', efMult: 1.0 },
          { id: 'business', label: 'Business Class', icon: '🛋️', efMult: 2.9 },
          { id: 'first',    label: 'First Class',    icon: '👑', efMult: 4.0 },
        ],
      },
      { id: 'bicycle', label: 'Bicycle', icon: '🚲', baseEF: 0,   unit: 'km' },
      { id: 'walking', label: 'Walking', icon: '🚶', baseEF: 0,   unit: 'km' },
    ],
  },

  {
    id: 'food', icon: '🍽️', label: 'Food & Diet',
    grad: ['#B2D054', '#8FA832'],
    // efPerKg = kg CO₂ per kg of food (used when user enters weight in kg)
    options: [
      {
        id: 'beef_meal', label: 'Beef', icon: '🥩', group: 'Red Meat',
        efPerKg: 33.05, unit: 'kg', isFood: true,
        aiHint: 'e.g. "grilled beef steak 300g for 1 person" or "beef karahi for 4 people, 800g meat"',
        scenarios: [
          { id: 'standard', label: 'Standard',      icon: '🥩', efMult: 1.0,  note: 'Average preparation' },
          { id: 'grilled',  label: 'Grilled / BBQ', icon: '🔥', efMult: 1.05, note: 'Grill energy +5%' },
          { id: 'fried',    label: 'Deep Fried',    icon: '🍳', efMult: 1.08, note: 'Oil + heat +8%' },
          { id: 'stew',     label: 'Stew / Curry',  icon: '🫕', efMult: 1.10, note: 'Slow cook +10%' },
          { id: 'roasted',  label: 'Oven Roasted',  icon: '♨️',  efMult: 1.03 },
          { id: 'custom_text', label: 'Describe My Meal', icon: '💬', isCustomText: true, note: 'AI-powered analysis' },
        ],
      },
      {
        id: 'lamb_meal', label: 'Lamb / Mutton', icon: '🍖', group: 'Red Meat',
        efPerKg: 29.2, unit: 'kg', isFood: true,
        aiHint: 'e.g. "slow-roasted leg of lamb 500g" or "mutton curry for 3 (600g meat)"',
        scenarios: [
          { id: 'standard', label: 'Standard',     icon: '🍖', efMult: 1.0 },
          { id: 'grilled',  label: 'Grilled',      icon: '🔥', efMult: 1.05 },
          { id: 'stew',     label: 'Stew / Curry', icon: '🫕', efMult: 1.10 },
          { id: 'roasted',  label: 'Roasted',      icon: '♨️',  efMult: 1.03 },
          { id: 'custom_text', label: 'Describe My Meal', icon: '💬', isCustomText: true, note: 'AI-powered analysis' },
        ],
      },
      {
        id: 'pork_meal', label: 'Pork', icon: '🥓', group: 'Red Meat',
        efPerKg: 12.25, unit: 'kg', isFood: true,
        aiHint: 'e.g. "fried pork chops 400g" or "pulled pork sandwich, about 200g pork"',
        scenarios: [
          { id: 'standard', label: 'Standard', icon: '🍖', efMult: 1.0 },
          { id: 'grilled',  label: 'Grilled',  icon: '🔥', efMult: 1.05 },
          { id: 'fried',    label: 'Fried',    icon: '🍳', efMult: 1.08 },
          { id: 'roasted',  label: 'Roasted',  icon: '♨️',  efMult: 1.03 },
          { id: 'custom_text', label: 'Describe My Meal', icon: '💬', isCustomText: true, note: 'AI-powered analysis' },
        ],
      },
      {
        id: 'chicken_meal', label: 'Chicken', icon: '🍗', group: 'Poultry',
        efPerKg: 8.27, unit: 'kg', isFood: true,
        aiHint: 'e.g. "chicken biryani for 4 people (500g chicken)" or "fried chicken wings 300g"',
        scenarios: [
          { id: 'standard', label: 'Standard',     icon: '🍗', efMult: 1.0 },
          { id: 'grilled',  label: 'Grilled',      icon: '🔥', efMult: 0.95, note: 'Lean method −5%' },
          { id: 'fried',    label: 'Deep Fried',   icon: '🍟', efMult: 1.15, note: 'Oil use +15%' },
          { id: 'curry',    label: 'Curry / Stew', icon: '🫕', efMult: 1.05 },
          { id: 'roasted',  label: 'Oven Roasted', icon: '♨️',  efMult: 0.97 },
          { id: 'custom_text', label: 'Describe My Meal', icon: '💬', isCustomText: true, note: 'AI-powered analysis' },
        ],
      },
      {
        id: 'fish_meal', label: 'Fish / Seafood', icon: '🐟', group: 'Seafood',
        efPerKg: 10.07, unit: 'kg', isFood: true,
        aiHint: 'e.g. "grilled salmon fillet 200g" or "fish & chips for 2 (total 400g fish)"',
        scenarios: [
          { id: 'standard', label: 'Standard',         icon: '🐟', efMult: 1.0 },
          { id: 'wild',     label: 'Wild Caught',      icon: '🎣', efMult: 0.9,  note: '−10% vs farmed' },
          { id: 'farmed',   label: 'Farmed Fish',      icon: '🐠', efMult: 1.2 },
          { id: 'fried',    label: 'Battered / Fried', icon: '🍟', efMult: 1.15 },
          { id: 'steamed',  label: 'Steamed',          icon: '♨️',  efMult: 0.95 },
          { id: 'custom_text', label: 'Describe My Meal', icon: '💬', isCustomText: true, note: 'AI-powered analysis' },
        ],
      },
      {
        id: 'dairy_meal', label: 'Dairy (Milk / Cheese)', icon: '🥛', group: 'Dairy',
        efPerKg: 5.4, unit: 'kg', isFood: true,
        aiHint: 'e.g. "1 litre whole milk" or "200g cheddar cheese used in cooking"',
        scenarios: [
          { id: 'standard',  label: 'Standard',       icon: '🥛', efMult: 1.0 },
          { id: 'full_fat',  label: 'Full Fat',        icon: '🧀', efMult: 1.1, note: 'Cheese / cream +10%' },
          { id: 'low_fat',   label: 'Low Fat / Skim',  icon: '🥤', efMult: 0.85 },
          { id: 'custom_text', label: 'Describe My Meal', icon: '💬', isCustomText: true, note: 'AI-powered analysis' },
        ],
      },
      {
        id: 'vegetables_meal', label: 'Vegetables', icon: '🥕', group: 'Plant-Based',
        efPerKg: 1.75, unit: 'kg', isFood: true,
        aiHint: 'e.g. "mixed salad 300g local vegetables" or "stir-fry with 500g imported veggies"',
        scenarios: [
          { id: 'standard', label: 'Raw / Salad',     icon: '🥗', efMult: 1.0 },
          { id: 'cooked',   label: 'Cooked',          icon: '♨️',  efMult: 1.1,  note: 'Boiling / steaming' },
          { id: 'imported', label: 'Air-Freighted',   icon: '✈️', efMult: 2.5,  note: 'Imported by air' },
          { id: 'custom_text', label: 'Describe My Meal', icon: '💬', isCustomText: true, note: 'AI-powered analysis' },
        ],
      },
      {
        id: 'processed_food', label: 'Processed / Fast Food', icon: '🍔', group: 'Processed',
        efPerKg: 8.14, unit: 'kg', isFood: true,
        aiHint: 'e.g. "McDonald\'s Big Mac meal ~0.35kg" or "pizza slice with toppings ~0.3kg"',
        scenarios: [
          { id: 'standard',   label: 'Standard',    icon: '🍔', efMult: 1.0 },
          { id: 'takeaway',   label: 'Takeaway',     icon: '📦', efMult: 1.1, note: 'Packaging +10%' },
          { id: 'restaurant', label: 'Restaurant',   icon: '🍽️', efMult: 1.3, note: 'Larger portion' },
          { id: 'custom_text', label: 'Describe My Meal', icon: '💬', isCustomText: true, note: 'AI-powered analysis' },
        ],
      },
      {
        id: 'vegetarian', label: 'Vegetarian Meal', icon: '🥦', group: 'Plant-Based',
        efPerKg: 3.13, unit: 'kg', isFood: true,
        aiHint: 'e.g. "cheese pizza 400g" or "paneer curry with rice for 2 (500g total)"',
        scenarios: [
          { id: 'standard',  label: 'Standard',       icon: '🥦', efMult: 1.0 },
          { id: 'dairy_hv',  label: 'Heavy Dairy',    icon: '🧀', efMult: 1.2, note: 'Lots of cheese/cream' },
          { id: 'egg',       label: 'Egg-Based',      icon: '🥚', efMult: 1.1 },
          { id: 'custom_text', label: 'Describe My Meal', icon: '💬', isCustomText: true, note: 'AI-powered analysis' },
        ],
      },
      {
        id: 'vegan', label: 'Vegan Meal', icon: '🥗', group: 'Plant-Based',
        efPerKg: 2.33, unit: 'kg', isFood: true,
        aiHint: 'e.g. "tofu stir-fry with local veg 400g" or "avocado toast 200g (imported avo)"',
        scenarios: [
          { id: 'standard', label: 'Standard',           icon: '🥗', efMult: 1.0 },
          { id: 'local',    label: 'Local / Seasonal',   icon: '🌱', efMult: 0.75, note: 'Local produce −25%' },
          { id: 'imported', label: 'Imported Produce',   icon: '✈️', efMult: 1.8,  note: 'Long-haul freight' },
          { id: 'custom_text', label: 'Describe My Meal', icon: '💬', isCustomText: true, note: 'AI-powered analysis' },
        ],
      },
    ],
  },

  {
    id: 'energy', icon: '⚡', label: 'Home Energy',
    grad: ['#E65100', '#BF360C'],
    options: [
      {
        id: 'electricity', label: 'Electricity (Grid)', icon: '💡',
        baseEF: 0.233, unit: 'kWh',
        aiHint: 'e.g. "AC running 6 hours at 18°C" or "electric heater overnight, 8 hours"',
        scenarios: [
          { id: 'standard',    label: 'Standard Grid',       icon: '💡', efMult: 1.0,  note: 'Average grid mix' },
          { id: 'ac',          label: 'Air Conditioning',    icon: '❄️',  efMult: 1.2,  note: 'AC higher load' },
          { id: 'heating',     label: 'Electric Heating',    icon: '🔆', efMult: 1.1 },
          { id: 'partial_re',  label: 'Partial Renewable',   icon: '⚡', efMult: 0.6,  note: '~40% clean' },
          { id: 'full_re',     label: 'Full Renewable',      icon: '☀️', efMult: 0.15, note: 'Solar / wind' },
          { id: 'custom_text', label: 'Describe My Usage',   icon: '💬', isCustomText: true, note: 'AI analysis' },
        ],
      },
      {
        id: 'natural_gas', label: 'Natural Gas', icon: '🔥',
        baseEF: 0.202, unit: 'kWh',
        aiHint: 'e.g. "cooked daal on gas stove 1.5 hours" or "gas heater in living room all day (10h)"',
        scenarios: [
          { id: 'standard',    label: 'Standard',         icon: '🔥', efMult: 1.0 },
          { id: 'cooking',     label: 'Cooking / Hob',    icon: '🍳', efMult: 0.85, note: 'Short bursts' },
          { id: 'heating',     label: 'Central Heating',  icon: '🏠', efMult: 1.0 },
          { id: 'hotwater',    label: 'Water Heating',    icon: '🚿', efMult: 0.95 },
          { id: 'custom_text', label: 'Describe My Usage',icon: '💬', isCustomText: true, note: 'AI analysis' },
        ],
      },
      { id: 'solar_energy', label: 'Solar Energy',       icon: '☀️', baseEF: 0.02,  unit: 'kWh' },
      { id: 'lpg_gas',      label: 'LPG / Cooking Gas', icon: '🍳', baseEF: 0.215, unit: 'kWh' },
      { id: 'coal_heating', label: 'Coal Heating',       icon: '🪨', baseEF: 0.341, unit: 'kWh' },
    ],
  },

  {
    id: 'shopping', icon: '🛍️', label: 'Shopping',
    grad: ['#6A1B9A', '#4A148C'],
    options: [
      // ── Men's Clothing ────────────────────────────────────────────────────
      { id: 'mens_tshirt',  label: 'T-Shirt / Polo',   icon: '👕', group: "👦 Men's",
        baseEF: 5,  unit: 'item',
        aiHint: 'e.g. "cotton Nike t-shirt bought at Zara" or "branded polo shirt"',
        scenarios: [
          { id: 'fast',        label: 'New Fast Fashion',  icon: '🏪', efMult: 1.0,  note: '~5 kg CO₂' },
          { id: 'brand',       label: 'New Premium Brand', icon: '⭐', efMult: 1.2,  note: '+20% higher quality' },
          { id: 'eco',         label: 'Eco / Organic',     icon: '🌿', efMult: 0.55, note: '−45% emissions' },
          { id: 'secondhand',  label: 'Second-Hand',       icon: '♻️',  efMult: 0.1,  note: 'Thrift −90%' },
          { id: 'custom_text', label: 'Describe Item',     icon: '💬', isCustomText: true, note: 'AI analysis' },
        ],
      },
      { id: 'mens_shirt',   label: 'Shirt / Formal',    icon: '👔', group: "👦 Men's",
        baseEF: 8,  unit: 'item',
        aiHint: 'e.g. "formal cotton dress shirt" or "casual linen button-up"',
        scenarios: [
          { id: 'fast',        label: 'New Fast Fashion',  icon: '🏪', efMult: 1.0 },
          { id: 'brand',       label: 'New Premium Brand', icon: '⭐', efMult: 1.2 },
          { id: 'eco',         label: 'Eco / Organic',     icon: '🌿', efMult: 0.55 },
          { id: 'secondhand',  label: 'Second-Hand',       icon: '♻️',  efMult: 0.1 },
          { id: 'custom_text', label: 'Describe Item',     icon: '💬', isCustomText: true, note: 'AI analysis' },
        ],
      },
      { id: 'mens_pants',   label: 'Jeans / Trousers',  icon: '👖', group: "👦 Men's",
        baseEF: 33, unit: 'item',
        aiHint: 'e.g. "Levis 501 denim jeans" or "chinos / formal trousers"',
        scenarios: [
          { id: 'fast',        label: 'New Fast Fashion',  icon: '🏪', efMult: 1.0 },
          { id: 'brand',       label: 'New Premium Brand', icon: '⭐', efMult: 1.2 },
          { id: 'eco',         label: 'Eco / Organic',     icon: '🌿', efMult: 0.55 },
          { id: 'secondhand',  label: 'Second-Hand',       icon: '♻️',  efMult: 0.1 },
          { id: 'custom_text', label: 'Describe Item',     icon: '💬', isCustomText: true, note: 'AI analysis' },
        ],
      },
      { id: 'mens_jacket',  label: 'Jacket / Hoodie',   icon: '🧥', group: "👦 Men's",
        baseEF: 25, unit: 'item',
        aiHint: 'e.g. "puffer winter jacket" or "zip-up hoodie from H&M"',
        scenarios: [
          { id: 'fast',        label: 'New Fast Fashion',  icon: '🏪', efMult: 1.0 },
          { id: 'brand',       label: 'New Premium Brand', icon: '⭐', efMult: 1.2 },
          { id: 'eco',         label: 'Eco / Organic',     icon: '🌿', efMult: 0.55 },
          { id: 'secondhand',  label: 'Second-Hand',       icon: '♻️',  efMult: 0.1 },
          { id: 'custom_text', label: 'Describe Item',     icon: '💬', isCustomText: true, note: 'AI analysis' },
        ],
      },
      { id: 'mens_shoes',   label: 'Shoes / Sneakers',  icon: '👟', group: "👦 Men's",
        baseEF: 18, unit: 'item',
        aiHint: 'e.g. "Nike Air Max sneakers" or "leather formal shoes"',
        scenarios: [
          { id: 'new',         label: 'Brand New',         icon: '📦', efMult: 1.0 },
          { id: 'eco',         label: 'Eco Brand',         icon: '🌿', efMult: 0.60, note: 'Sustainable materials' },
          { id: 'secondhand',  label: 'Second-Hand',       icon: '♻️',  efMult: 0.1 },
          { id: 'custom_text', label: 'Describe Item',     icon: '💬', isCustomText: true, note: 'AI analysis' },
        ],
      },

      // ── Women's Clothing ──────────────────────────────────────────────────
      { id: 'womens_top',    label: 'T-Shirt / Blouse',   icon: '👚', group: "👩 Women's",
        baseEF: 4.5, unit: 'item',
        aiHint: 'e.g. "floral chiffon blouse from Zara" or "basic cotton crop top"',
        scenarios: [
          { id: 'fast',        label: 'New Fast Fashion',  icon: '🏪', efMult: 1.0 },
          { id: 'brand',       label: 'New Premium Brand', icon: '⭐', efMult: 1.2 },
          { id: 'eco',         label: 'Eco / Organic',     icon: '🌿', efMult: 0.55 },
          { id: 'secondhand',  label: 'Second-Hand',       icon: '♻️',  efMult: 0.1 },
          { id: 'custom_text', label: 'Describe Item',     icon: '💬', isCustomText: true, note: 'AI analysis' },
        ],
      },
      { id: 'womens_dress',  label: 'Dress / Skirt',      icon: '👗', group: "👩 Women's",
        baseEF: 22, unit: 'item',
        aiHint: 'e.g. "H&M midi summer dress" or "formal evening gown"',
        scenarios: [
          { id: 'fast',        label: 'New Fast Fashion',  icon: '🏪', efMult: 1.0 },
          { id: 'brand',       label: 'New Premium Brand', icon: '⭐', efMult: 1.2 },
          { id: 'eco',         label: 'Eco / Organic',     icon: '🌿', efMult: 0.55 },
          { id: 'secondhand',  label: 'Second-Hand',       icon: '♻️',  efMult: 0.1 },
          { id: 'custom_text', label: 'Describe Item',     icon: '💬', isCustomText: true, note: 'AI analysis' },
        ],
      },
      { id: 'womens_pants',  label: 'Jeans / Trousers',   icon: '👖', group: "👩 Women's",
        baseEF: 28, unit: 'item',
        aiHint: 'e.g. "skinny jeans from Mango" or "wide-leg palazzo pants"',
        scenarios: [
          { id: 'fast',        label: 'New Fast Fashion',  icon: '🏪', efMult: 1.0 },
          { id: 'brand',       label: 'New Premium Brand', icon: '⭐', efMult: 1.2 },
          { id: 'eco',         label: 'Eco / Organic',     icon: '🌿', efMult: 0.55 },
          { id: 'secondhand',  label: 'Second-Hand',       icon: '♻️',  efMult: 0.1 },
          { id: 'custom_text', label: 'Describe Item',     icon: '💬', isCustomText: true, note: 'AI analysis' },
        ],
      },
      { id: 'womens_coat',   label: 'Coat / Jacket',      icon: '🧥', group: "👩 Women's",
        baseEF: 50, unit: 'item',
        aiHint: 'e.g. "wool winter coat" or "leather biker jacket"',
        scenarios: [
          { id: 'fast',        label: 'New Fast Fashion',  icon: '🏪', efMult: 1.0 },
          { id: 'brand',       label: 'New Premium Brand', icon: '⭐', efMult: 1.2 },
          { id: 'eco',         label: 'Eco / Organic',     icon: '🌿', efMult: 0.55 },
          { id: 'secondhand',  label: 'Second-Hand',       icon: '♻️',  efMult: 0.1 },
          { id: 'custom_text', label: 'Describe Item',     icon: '💬', isCustomText: true, note: 'AI analysis' },
        ],
      },
      { id: 'womens_shoes',  label: 'Shoes / Heels',      icon: '👠', group: "👩 Women's",
        baseEF: 16, unit: 'item',
        aiHint: 'e.g. "leather high heels" or "canvas sneakers from Vans"',
        scenarios: [
          { id: 'new',         label: 'Brand New',         icon: '📦', efMult: 1.0 },
          { id: 'eco',         label: 'Eco Brand',         icon: '🌿', efMult: 0.60 },
          { id: 'secondhand',  label: 'Second-Hand',       icon: '♻️',  efMult: 0.1 },
          { id: 'custom_text', label: 'Describe Item',     icon: '💬', isCustomText: true, note: 'AI analysis' },
        ],
      },

      // ── Kids' & Other ─────────────────────────────────────────────────────
      { id: 'kids_clothing', label: "Kids' Clothing",     icon: '🧒', group: "👶 Kids' & Other",
        baseEF: 3,  unit: 'item',
        aiHint: 'e.g. "children\'s school uniform shirt" or "kids jeans age 8"',
        scenarios: [
          { id: 'fast',        label: 'New Fast Fashion',  icon: '🏪', efMult: 1.0 },
          { id: 'eco',         label: 'Eco / Organic',     icon: '🌿', efMult: 0.55 },
          { id: 'secondhand',  label: 'Second-Hand',       icon: '♻️',  efMult: 0.1 },
          { id: 'custom_text', label: 'Describe Item',     icon: '💬', isCustomText: true, note: 'AI analysis' },
        ],
      },
      { id: 'underwear_socks', label: 'Underwear / Socks', icon: '🧦', group: "👶 Kids' & Other",
        baseEF: 2.5, unit: 'item',
        scenarios: [
          { id: 'new',         label: 'Brand New',   icon: '📦', efMult: 1.0 },
          { id: 'eco',         label: 'Eco Cotton',  icon: '🌿', efMult: 0.55 },
        ],
      },
      { id: 'accessories',   label: 'Bag / Belt / Scarf', icon: '👜', group: "👶 Kids' & Other",
        baseEF: 10, unit: 'item',
        aiHint: 'e.g. "leather handbag" or "canvas backpack from IKEA"',
        scenarios: [
          { id: 'new',         label: 'Brand New',         icon: '📦', efMult: 1.0 },
          { id: 'eco',         label: 'Eco / Vegan',       icon: '🌿', efMult: 0.60 },
          { id: 'secondhand',  label: 'Second-Hand',       icon: '♻️',  efMult: 0.1 },
          { id: 'custom_text', label: 'Describe Item',     icon: '💬', isCustomText: true, note: 'AI analysis' },
        ],
      },

      // ── Electronics ───────────────────────────────────────────────────────
      { id: 'electronics_small', label: 'Phone / Tablet',     icon: '📱', group: '📱 Electronics',
        baseEF: 70,  unit: 'item',
        aiHint: 'e.g. "iPhone 15 bought new" or "refurbished Samsung tablet"',
        scenarios: [
          { id: 'new',         label: 'Brand New',    icon: '📦', efMult: 1.0 },
          { id: 'refurbished', label: 'Refurbished',  icon: '♻️',  efMult: 0.4, note: '~28 kg remanufactured' },
          { id: 'custom_text', label: 'Describe Item',icon: '💬', isCustomText: true, note: 'AI analysis' },
        ],
      },
      { id: 'electronics_large', label: 'Laptop / TV / PC',  icon: '💻', group: '📱 Electronics',
        baseEF: 300, unit: 'item',
        aiHint: 'e.g. "MacBook Pro new" or "refurbished 55-inch smart TV"',
        scenarios: [
          { id: 'new',         label: 'Brand New',    icon: '📦', efMult: 1.0 },
          { id: 'refurbished', label: 'Refurbished',  icon: '♻️',  efMult: 0.4, note: '~120 kg remanufactured' },
          { id: 'custom_text', label: 'Describe Item',icon: '💬', isCustomText: true, note: 'AI analysis' },
        ],
      },

      // ── Furniture ─────────────────────────────────────────────────────────
      { id: 'furniture_sofa',     label: 'Sofa / Couch',        icon: '🛋️', group: '🏠 Furniture', baseEF: 150, unit: 'item',
        aiHint: 'e.g. "3-seater fabric sofa from IKEA" or "leather corner couch"',
        scenarios: [
          { id: 'standard',    label: 'New Standard',        icon: '📦', efMult: 1.0 },
          { id: 'solid_wood',  label: 'Sustainable Wood',    icon: '🌳', efMult: 0.7,  note: '−30% vs MDF' },
          { id: 'secondhand',  label: 'Second-Hand',         icon: '♻️',  efMult: 0.15, note: '−85%' },
          { id: 'custom_text', label: 'Describe',            icon: '💬', isCustomText: true, note: 'AI' },
        ],
      },
      { id: 'furniture_bed',      label: 'Bed / Mattress',      icon: '🛏️', group: '🏠 Furniture', baseEF: 120, unit: 'item',
        aiHint: 'e.g. "king-size memory foam mattress" or "wooden bed frame with slats"',
        scenarios: [
          { id: 'standard',    label: 'New Standard',        icon: '📦', efMult: 1.0 },
          { id: 'solid_wood',  label: 'Sustainable Wood',    icon: '🌳', efMult: 0.7 },
          { id: 'secondhand',  label: 'Second-Hand',         icon: '♻️',  efMult: 0.15 },
          { id: 'custom_text', label: 'Describe',            icon: '💬', isCustomText: true, note: 'AI' },
        ],
      },
      { id: 'furniture_table',    label: 'Table & Chairs',      icon: '🍽️', group: '🏠 Furniture', baseEF: 200, unit: 'item',
        aiHint: 'e.g. "6-seater dining table set solid oak" or "flat-pack MDF study desk"',
        scenarios: [
          { id: 'standard',    label: 'New Standard',        icon: '📦', efMult: 1.0 },
          { id: 'flatpack',    label: 'Flat-Pack (IKEA)',     icon: '🔩', efMult: 0.85, note: 'MDF/particleboard' },
          { id: 'solid_wood',  label: 'Solid Wood',          icon: '🌳', efMult: 0.7 },
          { id: 'secondhand',  label: 'Second-Hand',         icon: '♻️',  efMult: 0.15 },
          { id: 'custom_text', label: 'Describe',            icon: '💬', isCustomText: true, note: 'AI' },
        ],
      },
      { id: 'furniture_wardrobe', label: 'Wardrobe / Cabinet',  icon: '🚪', group: '🏠 Furniture', baseEF: 100, unit: 'item',
        scenarios: [
          { id: 'standard',    label: 'New Standard',        icon: '📦', efMult: 1.0 },
          { id: 'flatpack',    label: 'Flat-Pack',           icon: '🔩', efMult: 0.85 },
          { id: 'secondhand',  label: 'Second-Hand',         icon: '♻️',  efMult: 0.15 },
          { id: 'custom_text', label: 'Describe',            icon: '💬', isCustomText: true, note: 'AI' },
        ],
      },
      { id: 'furniture_shelf',    label: 'Shelf / Bookcase',    icon: '📚', group: '🏠 Furniture', baseEF: 50,  unit: 'item',
        scenarios: [
          { id: 'standard',    label: 'New Standard',        icon: '📦', efMult: 1.0 },
          { id: 'solid_wood',  label: 'Solid Wood',          icon: '🌳', efMult: 0.7 },
          { id: 'secondhand',  label: 'Second-Hand',         icon: '♻️',  efMult: 0.15 },
        ],
      },
      { id: 'furniture_desk',     label: 'Desk / Office Chair', icon: '🖥️', group: '🏠 Furniture', baseEF: 80,  unit: 'item',
        aiHint: 'e.g. "ergonomic office chair from Amazon" or "standing desk wood top"',
        scenarios: [
          { id: 'standard',    label: 'New Standard',        icon: '📦', efMult: 1.0 },
          { id: 'solid_wood',  label: 'Solid Wood',          icon: '🌳', efMult: 0.7 },
          { id: 'secondhand',  label: 'Second-Hand',         icon: '♻️',  efMult: 0.15 },
          { id: 'custom_text', label: 'Describe',            icon: '💬', isCustomText: true, note: 'AI' },
        ],
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LOCATION AUTOCOMPLETE
// ─────────────────────────────────────────────────────────────────────────────
function useLocationField() {
  const [text, setText]             = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected]     = useState(null);
  const [searching, setSearching]   = useState(false);
  const debounce = useRef(null);

  const onChangeText = useCallback((val) => {
    setText(val); setSelected(null); setSuggestions([]);
    if (debounce.current) clearTimeout(debounce.current);
    if (val.trim().length < 2) return;
    debounce.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await geocodeSearch(val.trim());
        setSuggestions(res.data.predictions ?? []);
      } catch { /* ignore */ }
      finally { setSearching(false); }
    }, 350);
  }, []);

  const pick  = useCallback((item) => { setText(item.shortName || item.description); setSelected(item); setSuggestions([]); }, []);
  const clear = useCallback(() => { setText(''); setSelected(null); setSuggestions([]); }, []);

  return { text, suggestions, selected, searching, onChangeText, pick, clear };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function SuggestionList({ suggestions, onPick, s }) {
  if (suggestions.length === 0) return null;
  return (
    <View style={s.dropdown}>
      {suggestions.map((item, i) => (
        <TouchableOpacity key={item.placeId ?? i} style={[s.dropItem, i === 0 && s.dropItemFirst]} onPress={() => onPick(item)}>
          <Text style={s.dropPin}>📍</Text>
          <View style={s.dropText}>
            <Text style={s.dropShort} numberOfLines={1}>{item.shortName || item.description.split(',')[0]}</Text>
            <Text style={s.dropFull}  numberOfLines={1}>{item.description}</Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// TypeList with inline accordion scenarios + AI custom input
function TypeListWithScenarios({
  options, selectedType, selectedScenario,
  onSelectType, onSelectScenario,
  customDesc, onSetCustomDesc,
  aiResult, aiLoading,
  onAnalyze,
  onSubmit, submitLoading,
  s,
}) {
  let lastGroup = null;
  return (
    <View style={s.typeList}>
      {options.map(o => {
        const isActive   = selectedType === o.id;
        const hasScen    = (o.scenarios?.length ?? 0) > 0;
        const showHeader = o.group && o.group !== lastGroup;
        lastGroup = o.group || lastGroup;
        return (
          <View key={o.id}>
            {showHeader && <Text style={s.groupHeader}>{o.group}</Text>}

            {/* ── Type row ── */}
            <TouchableOpacity
              style={[s.typeRow, isActive && s.typeRowActive]}
              onPress={() => onSelectType(o.id)}
              activeOpacity={0.8}
            >
              <Text style={s.typeIcon}>{o.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.typeLbl, isActive && { color: '#B2D054', fontWeight: '700' }]}>
                  {o.label}
                </Text>
                {hasScen && !isActive && (
                  <Text style={s.typeScenarioHint}>
                    {o.scenarios.length} scenarios · tap to expand
                  </Text>
                )}
              </View>
              {hasScen ? (
                <Text style={{ color: isActive ? '#B2D054' : 'rgba(255,255,255,0.30)', fontSize: 14, marginLeft: 8 }}>
                  {isActive ? '▲' : '▼'}
                </Text>
              ) : (
                isActive && <Text style={s.typeTick}>✓</Text>
              )}
            </TouchableOpacity>

            {/* ── Inline scenarios (accordion) ── */}
            {isActive && hasScen && (
              <View style={s.inlineScenarios}>
                <View style={s.scenarioWrap}>
                  {o.scenarios.map(sc => {
                    const scActive = selectedScenario === sc.id;
                    const perUnit  = sc.isCustomText
                      ? (aiResult ? aiResult.estimatedEF.toFixed(4) : '?')
                      : ((o.baseEF ?? 0) * (sc.efMult ?? 1)).toFixed(3);
                    return (
                      <TouchableOpacity
                        key={sc.id}
                        style={[s.scChip, scActive && s.scChipActive]}
                        onPress={() => onSelectScenario(sc.id)}
                        activeOpacity={0.8}
                      >
                        <Text style={s.scEmoji}>{sc.icon}</Text>
                        <Text style={[s.scLabel, scActive && s.scLabelActive]}>{sc.label}</Text>
                        <View style={[s.scBadge, scActive && s.scBadgeActive]}>
                          <Text style={[s.scBadgeTxt, scActive && { color: '#B2D054' }]}>
                            {sc.isCustomText ? 'AI analysis' : `${perUnit} kg/${o.unit}`}
                          </Text>
                        </View>
                        {sc.note ? <Text style={s.scNote}>{sc.note}</Text> : null}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* ── AI Custom Text Input ── */}
                {selectedScenario === 'custom_text' && (
                  <View style={s.aiBox}>
                    <Text style={s.aiBoxTitle}>💬 Describe your scenario</Text>
                    <Text style={s.aiBoxHint}>
                      {o.aiHint ?? 'Describe your specific situation and we\'ll calculate the CO₂ for you.'}
                    </Text>
                    <TextInput
                      style={s.aiInput}
                      placeholder="Type your scenario here…"
                      placeholderTextColor="rgba(255,255,255,0.30)"
                      value={customDesc}
                      onChangeText={onSetCustomDesc}
                      multiline
                      numberOfLines={2}
                    />
                    <TouchableOpacity
                      style={[s.aiBtn, (!customDesc?.trim() || aiLoading) && { opacity: 0.5 }]}
                      onPress={() => onAnalyze(o)}
                      disabled={!customDesc?.trim() || aiLoading}
                      activeOpacity={0.85}
                    >
                      <LinearGradient colors={['#B2D054','#8FA832']} style={s.aiBtnGrad}>
                        {aiLoading
                          ? <ActivityIndicator color="#fff" size="small" />
                          : <Text style={s.aiBtnTxt}>🤖 Analyse CO₂</Text>}
                      </LinearGradient>
                    </TouchableOpacity>

                    {/* AI result */}
                    {aiResult && (
                      <View style={s.aiResult}>
                        <View style={s.aiResultHeader}>
                          <Text style={s.aiResultEF}>{aiResult.estimatedEF} kg CO₂/{o.unit}</Text>
                          <Text style={s.aiResultMult}>×{aiResult.multiplier} multiplier</Text>
                        </View>
                        <Text style={s.aiResultExpl}>{aiResult.explanation}</Text>
                        {aiResult.breakdown?.length > 0 && (
                          <View style={s.aiBreakdown}>
                            {aiResult.breakdown.map((b, i) => (
                              <Text key={i} style={s.aiBreakdownItem}>→ {b}</Text>
                            ))}
                          </View>
                        )}
                        {aiResult.suggestedValue && (
                          <Text style={s.aiAutoFill}>
                            ✅ Auto-filled: {aiResult.suggestedValue} {o.unit}
                          </Text>
                        )}
                        {/* Log button directly after AI result */}
                        <TouchableOpacity
                          style={s.aiLogBtn}
                          onPress={onSubmit}
                          disabled={submitLoading}
                          activeOpacity={0.85}
                        >
                          <LinearGradient colors={['#B2D054','#8FA832']} style={s.aiLogBtnGrad}>
                            {submitLoading
                              ? <ActivityIndicator color="#fff" size="small" />
                              : <Text style={s.aiLogBtnTxt}>🌱 Log This Activity</Text>}
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
export default function LogActivityScreen({ navigation, route }) {
  const initCat = route?.params?.category || null;
  const { theme: appTheme } = useAppTheme();
  const C = useMemo(() => buildC(appTheme), [appTheme]);
  const s = useMemo(() => makeStyles(C), [C]);
  const { light, medium, success: hapticSuccess, error: hapticError } = useHaptics();
  const confettiRef = useRef(null);

  const [selectedCat,      setSelectedCat]      = useState(initCat);
  const [selectedType,     setSelectedType]      = useState(null);
  const [selectedScenario, setSelectedScenario]  = useState(null);
  const [customDesc,       setCustomDesc]        = useState('');
  const [aiResult,         setAiResult]          = useState(null);
  const [aiLoading,        setAiLoading]         = useState(false);
  const [value,            setValue]             = useState('');
  const [note,             setNote]              = useState('');
  const [loading,          setLoading]           = useState(false);
  const [success,          setSuccess]           = useState(null);
  const [distResult,       setDistResult]        = useState(null);
  const [distLoading,      setDistLoading]       = useState(false);

  const origin = useLocationField();
  const dest   = useLocationField();

  const cat         = CATEGORIES.find(c => c.id === selectedCat);
  const typeOpt     = cat?.options.find(o => o.id === selectedType);
  const scenarios   = typeOpt?.scenarios ?? [];
  const hasScenarios = scenarios.length > 0;
  const scenario    = scenarios.find(sc => sc.id === selectedScenario);
  const isTransport = selectedCat === 'transport';

  // Effective emission factor
  // — food: efPerKg × cooking-method multiplier  (value = weight in kg)
  // — other: baseEF × scenario multiplier        (value = km / kWh / items)
  const scenarioMult = scenario?.isCustomText
    ? (aiResult ? aiResult.multiplier : null)   // null = AI not yet run
    : (scenario?.efMult ?? 1);
  const baseRate = typeOpt?.isFood ? (typeOpt.efPerKg ?? 0) : (typeOpt?.baseEF ?? 0);
  const effectiveEF = (typeOpt && scenarioMult !== null)
    ? baseRate * (scenarioMult ?? 1)
    : 0;

  // AI analyse handler
  const handleAnalyze = useCallback(async (typeOption) => {
    if (!customDesc.trim()) return;
    setAiLoading(true); setAiResult(null);
    try {
      const res = await analyzeScenario({
        description: customDesc.trim(),
        category:    selectedCat,
        subType:     typeOption.id,
        baseEF:      typeOption.isFood ? (typeOption.efPerKg ?? 0) : (typeOption.baseEF ?? 0),
        unit:        typeOption.unit   ?? 'unit',
        isFood:      typeOption.isFood ?? false,
      });
      setAiResult(res.data);
      // Auto-fill value if AI determined the amount from the description
      if (res.data?.suggestedValue && res.data.suggestedValue > 0) {
        setValue(String(res.data.suggestedValue));
      }
    } catch (err) {
      showAlert('Analysis Failed', err.response?.data?.error || 'Could not analyse your scenario. Please try again.');
    } finally { setAiLoading(false); }
  }, [customDesc, selectedCat]);

  const co2Preview = typeOpt && value && parseFloat(value) > 0
    ? (effectiveEF * parseFloat(value)).toFixed(2)
    : null;

  // Step number helper
  const valueStep = isTransport ? (hasScenarios ? '④' : '③') : (hasScenarios ? '③' : '②');

  // ── Reset when type changes ─────────────────────────────────────────────────
  const handleTypeSelect = (id) => {
    if (id === selectedType) {
      setSelectedType(null); setSelectedScenario(null);
    } else {
      setSelectedType(id);   setSelectedScenario(null);
    }
    setAiResult(null); setCustomDesc('');
    setDistResult(null); setValue('');
  };

  // ── Distance calculator ─────────────────────────────────────────────────────
  const calcDistance = useCallback(async (originField, destField) => {
    if (!originField.text.trim() || !destField.text.trim()) return;
    setDistLoading(true); setDistResult(null);
    try {
      const payload = {
        origin:      originField.selected?.shortName || originField.text,
        destination: destField.selected?.shortName   || destField.text,
        subType:     selectedType,
        ...(originField.selected && { originLat: originField.selected.lat, originLng: originField.selected.lng }),
        ...(destField.selected   && { destLat:   destField.selected.lat,   destLng:   destField.selected.lng   }),
      };
      const res = await getDistance(payload);
      setDistResult(res.data);
      setValue(String(res.data.distanceKm));
    } catch (err) {
      showAlert('Not Found', err.response?.data?.error || 'Could not calculate distance.');
    } finally { setDistLoading(false); }
  }, [selectedType]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!selectedCat || !selectedType || !value || parseFloat(value) <= 0) {
      showAlert('Missing Info', 'Select a category, activity type, and enter a value.');
      return;
    }
    // If type has scenarios, require one to be selected
    if (hasScenarios && !selectedScenario) {
      showAlert('Choose a Scenario', 'Please select one of the scenario options to get an accurate carbon estimate.');
      return;
    }
    // If custom_text scenario, require AI analysis first
    if (selectedScenario === 'custom_text' && !aiResult) {
      showAlert('Analyse First', 'Please type your scenario description and press "Analyse CO₂" before logging.');
      return;
    }
    medium();
    setLoading(true);
    try {
      const payload = {
        category: selectedCat,
        subType:  selectedType,
        value:    parseFloat(value),
        note:     [scenario?.label, note].filter(Boolean).join(' · ') || '',
      };
      // Pass adjusted EF for scenarios that change the base factor
      if (scenario?.isCustomText && aiResult) {
        // AI-analysed food: use AI-returned EF (already per kg for food)
        payload.customEF = typeOpt?.isFood
          ? aiResult.estimatedEF
          : aiResult.estimatedEF;
        payload.note = [aiResult.explanation, note].filter(Boolean).join(' · ');
      } else if (typeOpt?.isFood) {
        // Food is always weight-based — always send customEF per kg
        payload.customEF = effectiveEF;
      } else if (scenario && !scenario.isCustomText && scenario.efMult !== 1.0) {
        payload.customEF = effectiveEF;
      }
      const res = await logActivity(payload);
      hapticSuccess();
      setSuccess(res.data);
      if (res.data?.newBadges?.length > 0) {
        setTimeout(() => confettiRef.current?.fire(), 300);
      }
      setValue(''); setNote(''); setSelectedType(null); setSelectedScenario(null); setDistResult(null);
      origin.clear(); dest.clear();
    } catch (err) {
      hapticError();
      showAlert('Error', err.response?.data?.error || 'Failed to log activity.');
    } finally { setLoading(false); }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (success) {
    return (
      <LinearGradient colors={['#0A1A0F', '#0C1B12', '#0E2016']} style={s.successWrap}>
        <EcoConfetti ref={confettiRef} />
        <Text style={s.successEmoji}>🌱</Text>
        <Text style={s.successTitle}>Activity Logged!</Text>
        <Text style={s.successCO2}>{success.data?.co2e?.toFixed(2)} kg CO₂ recorded</Text>
        {success.data?.note ? <Text style={s.successNote}>{success.data.note}</Text> : null}
        <View style={s.pointsPill}>
          <Text style={s.pointsTxt}>+{success.pointsEarned} eco-points earned ⭐</Text>
        </View>
        {success.newBadges?.length > 0 && (
          <View style={s.badgesBox}>
            <Text style={s.badgesTitle}>🏅 New Badge{success.newBadges.length > 1 ? 's' : ''} Unlocked!</Text>
            {success.newBadges.map((b, i) => <Text key={i} style={s.badgeItem}>{b.icon} {b.name}</Text>)}
          </View>
        )}
        <View style={s.successBtns}>
          <TouchableOpacity style={s.btnWhite} onPress={() => { setSuccess(null); setSelectedCat(null); }}>
            <Text style={s.btnWhiteTxt}>Log Another</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.btnGhost} onPress={() => navigation.navigate('Dashboard')}>
            <Text style={s.btnGhostTxt}>Dashboard</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={appTheme.bgGrad} style={{ flex: 1 }}>
    <ScrollView style={s.root} contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">

      {/* Hero — always dark green regardless of theme */}
      <LinearGradient colors={['#0A1A0F', '#0C1B12']} style={s.hero}>
        <Text style={s.heroIcon}>➕</Text>
        <Text style={s.heroTitle}>Log Activity</Text>
        <Text style={s.heroSub}>Track your daily carbon footprint</Text>
        <Text style={s.heroNote}>IPCC AR6 · GHG Protocol emission factors</Text>
      </LinearGradient>

      {/* ① Category */}
      <View style={s.card}>
        <Text style={s.stepLabel}>① Select Category</Text>
        <View style={s.catGrid}>
          {CATEGORIES.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[s.catCard, selectedCat === c.id && s.catCardActive]}
              onPress={() => {
                light();
                setSelectedCat(c.id);
                setSelectedType(null); setSelectedScenario(null);
                setCustomDesc(''); setAiResult(null);
                setDistResult(null); setValue('');
              }}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={selectedCat === c.id ? c.grad : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                style={s.catGrad}
              >
                <Text style={s.catIcon}>{c.icon}</Text>
                <Text style={[s.catLbl, selectedCat === c.id && { color: '#fff', fontWeight: '800' }]}>{c.label}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ② Activity type — scenarios expand inline below each option */}
      {cat && (
        <View style={s.card}>
          <Text style={s.stepLabel}>② Select Activity Type</Text>
          <TypeListWithScenarios
            options={cat.options}
            selectedType={selectedType}
            selectedScenario={selectedScenario}
            onSelectType={handleTypeSelect}
            onSelectScenario={(id) => { setSelectedScenario(id); setAiResult(null); setCustomDesc(''); }}
            customDesc={customDesc}
            onSetCustomDesc={setCustomDesc}
            aiResult={aiResult}
            aiLoading={aiLoading}
            onAnalyze={handleAnalyze}
            onSubmit={handleSubmit}
            submitLoading={loading}
            s={s}
          />
        </View>
      )}

      {/* Distance calculator (transport only) */}
      {typeOpt && isTransport && (
        <View style={s.card}>
          <Text style={s.stepLabel}>{hasScenarios ? '④' : '③'} Auto-Calculate Distance</Text>
          <Text style={s.distNote}>
            Type any place, city, or address — searched worldwide. Pick a suggestion then press Calculate.
          </Text>

          <Text style={s.fieldLabel}>📍 From</Text>
          <View style={[s.inputWrap, origin.selected && s.inputLocked]}>
            <TextInput
              style={s.locInput}
              placeholder="e.g. Times Square, Lahore Airport…"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={origin.text}
              onChangeText={origin.onChangeText}
              autoCorrect={false}
            />
            {origin.searching && <ActivityIndicator size="small" color="#4FC3F7" />}
            {origin.selected  && <Text style={s.lockIcon}>✓</Text>}
            {origin.text.length > 0 && (
              <TouchableOpacity onPress={origin.clear} style={s.clearBtn}>
                <Text style={s.clearX}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <SuggestionList suggestions={origin.suggestions} onPick={origin.pick} s={s} />

          <Text style={[s.fieldLabel, { marginTop: 14 }]}>🏁 To</Text>
          <View style={[s.inputWrap, dest.selected && s.inputLocked]}>
            <TextInput
              style={s.locInput}
              placeholder="e.g. Dubai Mall, Heathrow Airport…"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={dest.text}
              onChangeText={dest.onChangeText}
              autoCorrect={false}
            />
            {dest.searching && <ActivityIndicator size="small" color="#4FC3F7" />}
            {dest.selected  && <Text style={s.lockIcon}>✓</Text>}
            {dest.text.length > 0 && (
              <TouchableOpacity onPress={dest.clear} style={s.clearBtn}>
                <Text style={s.clearX}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
          <SuggestionList suggestions={dest.suggestions} onPick={dest.pick} s={s} />

          <TouchableOpacity
            style={[s.calcBtn, distLoading && { opacity: 0.6 }]}
            onPress={() => calcDistance(origin, dest)}
            disabled={distLoading}
          >
            <LinearGradient colors={['#1565C0', '#0D47A1']} style={s.calcGrad}>
              {distLoading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={s.calcTxt}>📍 Calculate Distance</Text>}
            </LinearGradient>
          </TouchableOpacity>

          {distResult && (
            <View style={s.resultCard}>
              <Text style={s.resultTitle}>🗺️ Route Found</Text>
              <View style={s.resultRow}>
                <Text style={s.resultLbl}>Distance</Text>
                <Text style={[s.resultVal, { color: '#4FC3F7', fontSize: 18, fontWeight: '800' }]}>{distResult.distanceText}</Text>
              </View>
              <View style={s.resultRow}>
                <Text style={s.resultLbl}>Duration</Text>
                <Text style={s.resultVal}>{distResult.durationText}</Text>
              </View>
              <Text style={s.resultNote}>✓ Distance auto-filled below</Text>
            </View>
          )}
        </View>
      )}

      {/* Value + Submit */}
      {typeOpt && (!hasScenarios || selectedScenario) && (
        <View style={s.card}>
          <Text style={s.stepLabel}>
            {valueStep} {typeOpt.isFood ? 'How much did you use? (kg)' : `Enter ${typeOpt.unit ?? 'Amount'}`}
          </Text>

          {/* CO₂ preview */}
          {co2Preview !== null && (
            <View style={[s.previewBox, { borderColor: parseFloat(co2Preview) < 3 ? '#B2D054' : '#FFD740' }]}>
              <View>
                <Text style={s.previewLbl}>Estimated CO₂</Text>
                <Text style={s.previewHint}>
                  {[typeOpt.label, scenario?.label].filter(Boolean).join(' · ')}
                  {typeOpt.isFood ? `  ·  ${value} kg` : ''}
                </Text>
              </View>
              <Text style={[s.previewVal, { color: parseFloat(co2Preview) < 3 ? '#B2D054' : '#FFD740' }]}>
                {co2Preview} kg
              </Text>
            </View>
          )}

          {typeOpt.isFood && (
            <Text style={s.foodWeightHint}>
              0.1 kg = 100g  ·  0.5 kg = 500g  ·  1 kg = 1000g
            </Text>
          )}
          <View style={s.inputWrap}>
            <TextInput
              style={s.locInput}
              placeholder={typeOpt.isFood ? 'e.g. 0.5 (500g) or 1 (1 kg)' : `e.g. ${typeOpt.unit === 'km' ? '15' : '1'} ${typeOpt.unit}`}
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
            />
            {typeOpt.isFood && <Text style={s.unitLabel}>kg</Text>}
          </View>

          <View style={[s.inputWrap, { marginTop: 10 }]}>
            <TextInput
              style={s.locInput}
              placeholder="Add a note (optional)"
              placeholderTextColor="rgba(255,255,255,0.35)"
              value={note}
              onChangeText={setNote}
            />
          </View>

          <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={loading}>
            <LinearGradient colors={['#B2D054', '#8FA832']} style={s.submitGrad}>
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.submitTxt}>🌱 Log Activity</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}


      <View style={{ height: 40 }} />
    </ScrollView>
    </LinearGradient>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ── Styles factory — rebuilt whenever theme changes ───────────────────────────
function makeStyles(C) { return StyleSheet.create({
  root:    { flex: 1, backgroundColor: 'transparent' },
  content: { paddingBottom: 40 },

  // Hero always dark-green — intentional regardless of theme
  hero:      { paddingTop: Platform.OS === 'ios' ? 54 : 38, paddingBottom: 28, alignItems: 'center' },
  heroIcon:  { fontSize: 44, marginBottom: 8 },
  heroTitle: { fontSize: 26, fontWeight: '800', color: '#fff' },
  heroSub:   { fontSize: 13, color: 'rgba(255,255,255,0.75)', marginTop: 4 },
  heroNote:  { fontSize: 10, color: 'rgba(255,255,255,0.40)', marginTop: 8, letterSpacing: 0.5 },

  card:      { margin: 12, marginTop: 0, marginBottom: 10,
               backgroundColor: C.card, borderRadius: 16,
               padding: 12, borderWidth: 1, borderColor: C.border,
               shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  stepLabel: { fontSize: 12, fontWeight: '800', color: C.text, marginBottom: 10, letterSpacing: 0.2 },

  catGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  catCard:       { width: '47%', flexGrow: 1, borderRadius: 12, overflow: 'hidden', borderWidth: 1.5, borderColor: 'transparent' },
  catCardActive: { borderColor: C.green600 + '88' },
  catGrad:       { padding: 10, alignItems: 'center' },
  catIcon:       { fontSize: 22, marginBottom: 4 },
  catLbl:        { fontSize: 11, color: C.textSub, textAlign: 'center', fontWeight: '600' },

  groupHeader:  { fontSize: 9, fontWeight: '800', color: C.textMuted,
                  letterSpacing: 1, textTransform: 'uppercase',
                  marginTop: 8, marginBottom: 3, paddingHorizontal: 4 },
  typeList:          { gap: 4 },
  typeRow:           { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg,
                       borderRadius: 10, padding: 9, borderWidth: 1, borderColor: 'transparent' },
  typeRowActive:     { borderColor: C.green600, backgroundColor: C.green50 },
  typeIcon:          { fontSize: 16, marginRight: 10 },
  typeLbl:           { fontSize: 13, color: C.textSub },
  typeScenarioHint:  { fontSize: 9, color: C.green600, marginTop: 1, opacity: 0.75 },
  typeTick:          { fontSize: 14, color: C.green600, fontWeight: '800' },

  inlineScenarios: {
    marginTop: 4, marginLeft: 8,
    paddingLeft: 12,
    borderLeftWidth: 2, borderLeftColor: C.green600 + '44',
    paddingBottom: 6,
  },

  scenarioWrap:    { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 4 },
  scChip:          { width: '31%', flexGrow: 1, backgroundColor: C.inputBg,
                     borderRadius: 10, padding: 8, borderWidth: 1.5,
                     borderColor: C.border, alignItems: 'center', gap: 3 },
  scChipActive:    { borderColor: C.green600, backgroundColor: C.green50 },
  scEmoji:         { fontSize: 16 },
  scLabel:         { fontSize: 10, fontWeight: '700', color: C.textSub, textAlign: 'center' },
  scLabelActive:   { color: C.green600 },
  scBadge:         { backgroundColor: C.pillBg, borderRadius: 6, paddingHorizontal: 5, paddingVertical: 2 },
  scBadgeActive:   { backgroundColor: C.green50 },
  scBadgeTxt:      { fontSize: 9, color: C.textSub, fontWeight: '700' },
  scNote:          { fontSize: 8, color: C.textMuted, textAlign: 'center' },

  distNote:   { fontSize: 12, color: C.textSub, marginBottom: 14, lineHeight: 17 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: C.textSub, marginBottom: 6 },

  inputWrap:   { flexDirection: 'row', alignItems: 'center', backgroundColor: C.inputBg,
                 borderRadius: 12, paddingHorizontal: 12, height: 48,
                 borderWidth: 1, borderColor: C.border },
  inputLocked: { borderColor: C.green600, backgroundColor: C.green50 },
  locInput:    { flex: 1, color: C.text, fontSize: 14, height: 48 },
  lockIcon:    { fontSize: 14, color: C.green600, fontWeight: '800', marginLeft: 6 },
  clearBtn:    { padding: 4, marginLeft: 4 },
  clearX:      { fontSize: 13, color: C.textMuted, fontWeight: '700' },

  dropdown:      { backgroundColor: C.cardSolid, borderRadius: 12, borderWidth: 1,
                   borderColor: C.teal600 + '44', marginTop: 4, overflow: 'hidden' },
  dropItem:      { flexDirection: 'row', alignItems: 'flex-start', padding: 12,
                   borderTopWidth: 1, borderTopColor: C.divider },
  dropItemFirst: { borderTopWidth: 0 },
  dropPin:       { fontSize: 14, marginRight: 8, marginTop: 1 },
  dropText:      { flex: 1 },
  dropShort:     { fontSize: 14, fontWeight: '600', color: C.text },
  dropFull:      { fontSize: 11, color: C.textMuted, marginTop: 2 },

  calcBtn:  { marginTop: 14, borderRadius: 12, overflow: 'hidden' },
  calcGrad: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  calcTxt:  { color: '#fff', fontWeight: '800', fontSize: 14 },

  resultCard:   { marginTop: 12, backgroundColor: C.teal50, borderRadius: 14,
                  padding: 14, borderWidth: 1, borderColor: C.teal100 },
  resultTitle:  { fontSize: 14, fontWeight: '800', color: C.teal600, marginBottom: 10 },
  resultRow:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 },
  resultLbl:    { fontSize: 12, color: C.textSub },
  resultVal:    { fontSize: 13, color: C.text, fontWeight: '600' },
  resultNote:   { fontSize: 11, color: C.green600, marginTop: 6, fontWeight: '600', textAlign: 'center' },

  previewBox:  { borderWidth: 1.5, borderRadius: 14, padding: 14, marginBottom: 12,
                 flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                 backgroundColor: C.card },
  previewLbl:  { fontSize: 13, color: C.text, fontWeight: '700' },
  previewHint: { fontSize: 10, color: C.textMuted, marginTop: 2 },
  previewVal:  { fontSize: 24, fontWeight: '900' },

  submitBtn:  { marginTop: 14, borderRadius: 14, overflow: 'hidden' },
  submitGrad: { paddingVertical: 16, alignItems: 'center' },
  submitTxt:  { color: '#1A2318', fontSize: 16, fontWeight: '800' },

  foodWeightHint: { fontSize: 11, color: C.textMuted, marginBottom: 8, lineHeight: 16 },
  unitLabel:      { fontSize: 14, fontWeight: '800', color: C.green600, marginLeft: 6 },

  aiBox:          { marginTop: 12, backgroundColor: C.green50, borderRadius: 16,
                    padding: 14, borderWidth: 1, borderColor: C.green100 },
  aiBoxTitle:     { fontSize: 13, fontWeight: '800', color: C.green600, marginBottom: 4 },
  aiBoxHint:      { fontSize: 11, color: C.textMuted, marginBottom: 10, lineHeight: 16 },
  aiInput:        { backgroundColor: C.inputBg, borderRadius: 12,
                    padding: 12, color: C.text, fontSize: 14, lineHeight: 20,
                    borderWidth: 1, borderColor: C.border, minHeight: 60,
                    textAlignVertical: 'top', marginBottom: 10 },
  aiBtn:          { borderRadius: 12, overflow: 'hidden' },
  aiBtnGrad:      { paddingVertical: 13, alignItems: 'center' },
  aiBtnTxt:       { color: '#1A2318', fontWeight: '800', fontSize: 14 },
  aiResult:       { marginTop: 12, backgroundColor: C.green50, borderRadius: 12,
                    padding: 12, borderWidth: 1, borderColor: C.green100 },
  aiResultHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  aiResultEF:     { fontSize: 18, fontWeight: '900', color: C.green600 },
  aiResultMult:   { fontSize: 11, color: C.green600, fontWeight: '700', opacity: 0.75 },
  aiResultExpl:   { fontSize: 12, color: C.textSub, lineHeight: 17, marginBottom: 6 },
  aiBreakdown:    { gap: 3 },
  aiBreakdownItem:{ fontSize: 11, color: C.green600, fontWeight: '600', opacity: 0.8 },
  aiAutoFill:     { fontSize: 11, color: C.green600, fontWeight: '700', marginTop: 8,
                    backgroundColor: C.green100, borderRadius: 8, padding: 6, textAlign: 'center' },
  aiLogBtn:       { marginTop: 12, borderRadius: 12, overflow: 'hidden' },
  aiLogBtnGrad:   { paddingVertical: 14, alignItems: 'center' },
  aiLogBtnTxt:    { color: '#1A2318', fontWeight: '900', fontSize: 15 },

  // Success screen — always dark green
  successWrap:   { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  successEmoji:  { fontSize: 80, marginBottom: 12 },
  successTitle:  { fontSize: 28, fontWeight: '900', color: '#B2D054', marginBottom: 4 },
  successCO2:    { fontSize: 16, color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  successNote:   { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4, fontStyle: 'italic' },
  pointsPill:    { backgroundColor: 'rgba(255,215,64,0.2)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginTop: 10, borderWidth: 1, borderColor: 'rgba(255,215,64,0.4)' },
  pointsTxt:     { color: '#FFD740', fontWeight: '700', fontSize: 14 },
  badgesBox:     { backgroundColor: 'rgba(178,208,84,0.12)', borderRadius: 16, padding: 14, marginTop: 14, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: 'rgba(178,208,84,0.30)' },
  badgesTitle:   { fontSize: 14, fontWeight: '800', color: '#B2D054', marginBottom: 6 },
  badgeItem:     { fontSize: 14, color: '#fff', marginVertical: 2 },
  successBtns:   { flexDirection: 'row', gap: 12, marginTop: 24 },
  btnWhite:      { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  btnWhiteTxt:   { color: '#0A2E0A', fontWeight: '800', fontSize: 15 },
  btnGhost:      { borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.4)', borderRadius: 14, paddingHorizontal: 24, paddingVertical: 14 },
  btnGhostTxt:   { color: '#fff', fontWeight: '700', fontSize: 15 },
}); } // end makeStyles
