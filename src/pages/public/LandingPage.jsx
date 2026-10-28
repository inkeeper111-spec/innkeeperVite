import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { DatePicker } from '../../components/ui/DatePicker';
import { AppFooter } from '../../components/layout/AppFooter';
import {
  Calendar,
  Users,
  Search,
  Sparkles,
  Wifi,
  Coffee,
  Waves,
  Utensils,
  CheckCircle2,
  ShieldCheck,
  Star,
  ArrowRight
} from 'lucide-react';
import dayjs from 'dayjs';

const currencySymbol = (code) =>
  ({ USD: '$', INR: '₹', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$' }[code] || '$');

export const LandingPage = () => {
  const [hotels, setHotels] = useState([]);
  const [hotel, setHotel] = useState(null);
  const [roomTypes, setRoomTypes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search Dates
  const [searchDates, setSearchDates] = useState({
    checkInDate: dayjs().add(1, 'day').format('YYYY-MM-DD'),
    checkOutDate: dayjs().add(3, 'day').format('YYYY-MM-DD'),
    adults: 2
  });

  const [availableCategories, setAvailableCategories] = useState([]);
  const [isSearched, setIsSearched] = useState(false);
  const [searching, setSearching] = useState(false);

  // Booking Modal
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [guestForm, setGuestForm] = useState({
    name: '',
    email: '',
    phone: '',
    specialRequests: ''
  });
  const [bookingSuccess, setBookingSuccess] = useState(null);

  const loadHotel = async (slug) => {
    const path = slug ? `/public/hotel/${slug}` : '/public/hotel';
    const res = await api.get(path);
    if (res.data.success) {
      setHotel(res.data.data.hotel);
      setRoomTypes(res.data.data.roomTypes);
      setAvailableCategories([]);
      setIsSearched(false);
    }
  };

  useEffect(() => {
    const fetchPublicInfo = async () => {
      try {
        setLoading(true);
        const listRes = await api.get('/public/hotels');
        const hotelList = listRes.data?.data?.hotels || [];
        setHotels(hotelList);
        const preferred = hotelList.find((h) => h.roomCount > 0) || hotelList[0];
        await loadHotel(preferred?.slug);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPublicInfo();
  }, []);

  const handleSearchAvailability = async (e) => {
    e.preventDefault();
    if (!hotel) return;
    setSearching(true);
    try {
      const res = await api.get(
        `/public/rooms/search?hotelId=${hotel.id}&checkInDate=${searchDates.checkInDate}&checkOutDate=${searchDates.checkOutDate}&adults=${searchDates.adults}`
      );
      if (res.data.success) {
        setAvailableCategories(res.data.data.categories);
        setIsSearched(true);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const handleOpenBooking = (type) => {
    setSelectedType(type);
    setIsBookModalOpen(true);
  };

  const handleConfirmReservation = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/public/bookings', {
        hotelId: hotel.id,
        guestName: guestForm.name,
        guestEmail: guestForm.email,
        guestPhone: guestForm.phone,
        checkInDate: searchDates.checkInDate,
        checkOutDate: searchDates.checkOutDate,
        roomTypeId: selectedType._id,
        adultsCount: searchDates.adults,
        specialRequests: guestForm.specialRequests
      });

      if (res.data.success) {
        setBookingSuccess(res.data.data);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Reservation booking failed');
    }
  };

  const nights = dayjs(searchDates.checkOutDate).diff(dayjs(searchDates.checkInDate), 'day') || 1;
  const money = currencySymbol(hotel?.currency);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navigation */}
      <header className="min-h-16 bg-slate-900 text-white sticky top-0 z-30 px-3 sm:px-8 flex flex-wrap items-center justify-between gap-2 py-2 sm:min-h-20 sm:flex-nowrap border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orvelle-champagne text-orvelle-primary flex items-center justify-center font-serif font-black text-xl shadow-md">
            O
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight block">
              {hotel?.name || 'Innkeeper Hotel & Spa'}
            </span>
            <span className="text-[10px] uppercase font-bold text-amber-400 tracking-widest">
              Luxury Hospitality
            </span>
          </div>
        </div>

        <div className="flex w-full items-center justify-end gap-2 sm:w-auto sm:gap-3">
          <Link
            to="/lookup"
            className="min-w-0 flex-1 text-center text-[11px] font-semibold text-slate-300 hover:text-white px-2 py-2 rounded-lg hover:bg-slate-800 transition-colors sm:flex-none"
          >
            Find My Reservation
          </Link>
          <Link
            to="/login"
            className="shrink-0 text-xs font-bold bg-brand-600 hover:bg-brand-500 text-white px-3 py-2 rounded-xl transition-all shadow-md sm:px-4"
          >
            Staff Portal
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative bg-slate-900 text-white py-20 px-4 sm:px-8 overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <img
            src="https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=2000&q=80"
            alt="Hero Background"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-5xl mx-auto text-center space-y-4">
          <span className="inline-flex items-center gap-1.5 text-xs uppercase font-extrabold tracking-widest text-amber-400 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">
            <Star className="w-3.5 h-3.5 fill-current" /> Five-Star Oceanfront Retreat
          </span>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
            An Unparalleled Hospitality Experience
          </h1>
          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Immerse yourself in timeless luxury, world-class amenities, and breathtaking views at{' '}
            {hotel?.name || 'Innkeeper'}. Reserve your stay with guaranteed best rates.
          </p>

          {/* Availability Search Bar Widget */}
          <div className="mt-8 bg-white text-slate-900 p-4 sm:p-5 rounded-2xl shadow-2xl max-w-5xl mx-auto border border-slate-100 text-left">
            <form onSubmit={handleSearchAvailability} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              {hotels.length > 1 && (
                <Select
                  label="Hotel"
                  value={hotel?.slug || ''}
                  onChange={async (e) => {
                    const next = hotels.find((h) => h.slug === e.target.value);
                    if (next) await loadHotel(next.slug);
                  }}
                  options={hotels.map((h) => ({
                    value: h.slug,
                    label: h.city ? `${h.name} · ${h.city}` : h.name
                  }))}
                />
              )}
              <DatePicker
                label="Check-In Date"
                required
                value={searchDates.checkInDate}
                min={dayjs().format('YYYY-MM-DD')}
                onChange={(e) => setSearchDates({ ...searchDates, checkInDate: e.target.value })}
              />

              <DatePicker
                label="Check-Out Date"
                required
                value={searchDates.checkOutDate}
                min={searchDates.checkInDate}
                onChange={(e) => setSearchDates({ ...searchDates, checkOutDate: e.target.value })}
              />

              <Select
                label="Guests"
                value={String(searchDates.adults)}
                onChange={(e) => setSearchDates({ ...searchDates, adults: Number(e.target.value) })}
                options={[
                  { value: '1', label: '1 Adult' },
                  { value: '2', label: '2 Adults' },
                  { value: '3', label: '3 Adults' },
                  { value: '4', label: '4+ Adults' }
                ]}
              />

              <div>
                <Button type="submit" variant="primary" loading={searching} className="w-full py-2.5 text-xs font-bold" size="lg">
                  Check Availability
                </Button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Real-Time Available Rooms Section */}
      {isSearched && (
        <section className="py-12 px-4 sm:px-8 max-w-6xl mx-auto w-full">
          <div className="border-b border-slate-200 pb-4 mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">Available Suites for Selected Dates</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {dayjs(searchDates.checkInDate).format('MMM D, YYYY')} to {dayjs(searchDates.checkOutDate).format('MMM D, YYYY')} ({nights} Night{nights > 1 ? 's' : ''})
              </p>
            </div>
          </div>

          {availableCategories.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
              No rooms available for the selected dates. Please adjust your dates or guest count.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {availableCategories.map((cat) => {
                const rt = cat.roomType;
                const totalCost = rt.basePrice * nights;
                return (
                  <div
                    key={rt._id}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-lg transition-all"
                  >
                    <div>
                      <div className="h-48 overflow-hidden relative bg-slate-100">
                        <img
                          src={rt.images?.[0] || 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1000&q=80'}
                          alt={rt.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-3 right-3 bg-emerald-600 text-white font-bold text-[11px] px-2.5 py-1 rounded-full shadow-md">
                          {cat.availableCount} Unit{cat.availableCount > 1 ? 's' : ''} Left
                        </div>
                      </div>

                      <div className="p-5">
                        <h3 className="font-bold text-slate-900 text-base">{rt.name}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{rt.description}</p>

                        <div className="mt-3 flex items-center gap-3 text-xs text-slate-600 font-medium">
                          <span>Max {rt.maxOccupancy} Guests</span>
                          <span>•</span>
                          <span>{rt.bedConfiguration}</span>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap gap-1.5">
                          {rt.amenities?.slice(0, 3).map((am, i) => (
                            <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                              {am}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-0 border-t border-slate-50 mt-4 flex items-center justify-between">
                      <div>
                        <span className="text-lg font-black text-slate-900">{money}{rt.basePrice}</span>
                        <span className="text-[11px] text-slate-400"> / night</span>
                        <span className="text-[10px] text-slate-500 block font-semibold">
                          Total: {money}{totalCost} ({nights} nts)
                        </span>
                      </div>

                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleOpenBooking(rt)}
                      >
                        Book Now
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* Featured Suites Overview (Default catalog) */}
      {!isSearched && (
        <section className="py-16 px-4 sm:px-8 max-w-6xl mx-auto w-full">
          <div className="text-center max-w-xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Featured Rooms & Luxury Suites
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Designed with bespoke finishes, custom linens, and state-of-the-art climate control.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roomTypes.map((rt) => (
              <div
                key={rt._id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className="h-48 overflow-hidden relative bg-slate-100">
                    <img
                      src={rt.images?.[0] || 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1000&q=80'}
                      alt={rt.name}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="p-5">
                    <h3 className="font-bold text-slate-900 text-base">{rt.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{rt.description}</p>
                    <div className="mt-3 flex items-center gap-3 text-xs text-slate-600 font-medium">
                      <span>Max {rt.maxOccupancy} Guests</span>
                      <span>•</span>
                      <span>{rt.bedConfiguration}</span>
                    </div>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-slate-50 flex items-center justify-between">
                  <div>
                    <span className="text-lg font-black text-slate-900">{money}{rt.basePrice}</span>
                    <span className="text-[11px] text-slate-400"> / night</span>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedType(rt);
                      setIsBookModalOpen(true);
                    }}
                  >
                    Reserve
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Amenities Section */}
      <section className="bg-slate-900 text-white py-16 px-4 sm:px-8 mt-auto">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-black tracking-tight">World-Class Guest Amenities</h2>
            <p className="text-xs text-slate-400 mt-1">Every detail curated for relaxation and effortless indulgence</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-center">
            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/60">
              <Waves className="w-8 h-8 text-brand-400 mx-auto mb-2" />
              <h4 className="font-bold text-sm">Oceanview Infinity Pool</h4>
              <p className="text-[11px] text-slate-400 mt-1">Heated year-round with cabana service</p>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/60">
              <Utensils className="w-8 h-8 text-amber-400 mx-auto mb-2" />
              <h4 className="font-bold text-sm">Fine Dining & Bar</h4>
              <p className="text-[11px] text-slate-400 mt-1">Artisanal farm-to-table cuisine</p>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/60">
              <Coffee className="w-8 h-8 text-indigo-400 mx-auto mb-2" />
              <h4 className="font-bold text-sm">24/7 Room Service</h4>
              <p className="text-[11px] text-slate-400 mt-1">Chef-crafted in-suite culinary delivery</p>
            </div>

            <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/60">
              <Wifi className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <h4 className="font-bold text-sm">Ultra High-Speed Wi-Fi</h4>
              <p className="text-[11px] text-slate-400 mt-1">Complimentary fiber network coverage</p>
            </div>
          </div>
        </div>
      </section>

      {/* Booking Checkout Modal */}
      <Modal
        isOpen={isBookModalOpen}
        onClose={() => {
          setIsBookModalOpen(false);
          setBookingSuccess(null);
        }}
        title={bookingSuccess ? 'Reservation Request Submitted' : `Reserve: ${selectedType?.name}`}
        subtitle={bookingSuccess ? 'Your stay is awaiting approval from the hotel team' : 'Submit a reservation request'}
      >
        {bookingSuccess ? (
          <div className="space-y-4 text-xs">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <h3 className="font-black text-emerald-950 text-base">Reservation Request Received</h3>
              <p className="font-mono text-xl font-black text-emerald-700">
                {bookingSuccess.bookingReference}
              </p>
              <p className="text-emerald-800 text-xs">
                Your request is pending hotel approval. You can check its status using your reference and email.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Suite Type:</span>
                <span className="font-bold text-slate-800">{selectedType?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Stay Duration:</span>
                <span className="font-semibold text-slate-700">
                  {searchDates.checkInDate} to {searchDates.checkOutDate} ({nights} nights)
                </span>
              </div>
              <div className="flex justify-between font-bold text-sm text-slate-900 border-t border-slate-200 pt-2">
                <span>Total Folio Amount:</span>
                <span>{money}{bookingSuccess.reservation?.totalAmount}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Link to={`/lookup?reference=${bookingSuccess.bookingReference}&email=${guestForm.email}`}>
                <Button variant="primary">
                  View Reservation Status and Folio
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleConfirmReservation} className="space-y-4">
            <Input
              label="Primary Guest Name"
              required
              value={guestForm.name}
              onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })}
              placeholder="Evelyn Hayes"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Email Address"
                type="email"
                required
                value={guestForm.email}
                onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })}
                placeholder="evelyn@example.com"
              />
              <Input
                label="Phone Number"
                required
                value={guestForm.phone}
                onChange={(e) => setGuestForm({ ...guestForm, phone: e.target.value })}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Rate ({nights} Nights @ {money}{selectedType?.basePrice}):</span>
                <span className="font-mono font-semibold">{money}{(selectedType?.basePrice || 0) * nights}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Applicable Hospitality Tax (10%):</span>
                <span className="font-mono font-semibold">{money}{Math.round((selectedType?.basePrice || 0) * nights * 0.10)}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-1.5">
                <span>Estimated Total:</span>
                <span className="font-mono">{money}{Math.round((selectedType?.basePrice || 0) * nights * 1.10)}</span>
              </div>
            </div>

            <Input
              label="Special Requests (e.g. arrival time, dietary requests)"
              value={guestForm.specialRequests}
              onChange={(e) => setGuestForm({ ...guestForm, specialRequests: e.target.value })}
              placeholder="High floor room, quiet wing"
            />

            <div className="flex justify-end gap-3 pt-3">
              <Button variant="secondary" type="button" onClick={() => setIsBookModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" type="submit">
                Confirm & Guarantee Reservation
              </Button>
            </div>
          </form>
        )}
      </Modal>
      <AppFooter />
    </div>
  );
};
