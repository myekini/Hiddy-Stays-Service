import { supabase } from '@/integrations/supabase/client';

interface PendingBooking {
  id?: number;
  data: {
    propertyId: string;
    checkIn: string;
    checkOut: string;
    guests: number;
    totalPrice: number;
    hostId: string;
    guestEmail: string;
    guestName: string;
  };
  timestamp: number;
}

class OfflineBookingService {
  private dbName = 'BookDirectDB';
  private version = 1;
  private storeName = 'pendingBookings';

  async openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  async savePendingBooking(bookingData: PendingBooking['data']): Promise<boolean> {
    try {
      // Try online booking first
      if (navigator.onLine) {
        return await this.processOnlineBooking(bookingData);
      } else {
        // Save for offline sync
        await this.saveOfflineBooking(bookingData);
        return true;
      }
    } catch (error) {
      console.error('Booking failed, saving offline:', error);
      await this.saveOfflineBooking(bookingData);
      return true;
    }
  }

  private async processOnlineBooking(bookingData: PendingBooking['data']): Promise<boolean> {
    const { data, error } = await supabase
      .from('bookings')
      .insert([{
        property_id: bookingData.propertyId,
        check_in_date: bookingData.checkIn,
        check_out_date: bookingData.checkOut,
        guests_count: bookingData.guests,
        total_amount: bookingData.totalPrice,
        host_id: bookingData.hostId,
        guest_id: bookingData.guestEmail, // Using email as guest_id for now
        status: 'confirmed'
      }]);

    if (error) throw error;
    return true;
  }

  private async saveOfflineBooking(bookingData: PendingBooking['data']): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);
    
    const pendingBooking: PendingBooking = {
      data: bookingData,
      timestamp: Date.now()
    };

    return new Promise((resolve, reject) => {
      const request = store.add(pendingBooking);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.scheduleBackgroundSync();
        resolve();
      };
    });
  }

  private scheduleBackgroundSync(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Background sync may not be supported in all browsers
        if ('sync' in registration) {
          return (registration as any).sync.register('booking-sync');
        }
      }).catch((error) => {
        console.error('Background sync registration failed:', error);
      });
    }
  }

  async getPendingBookings(): Promise<PendingBooking[]> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readonly');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
    });
  }

  async clearPendingBookings(): Promise<void> {
    const db = await this.openDB();
    const transaction = db.transaction([this.storeName], 'readwrite');
    const store = transaction.objectStore(this.storeName);

    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async syncPendingBookings(): Promise<void> {
    if (!navigator.onLine) return;

    const pendingBookings = await this.getPendingBookings();
    const db = await this.openDB();

    for (const booking of pendingBookings) {
      try {
        await this.processOnlineBooking(booking.data);
        
        // Remove successfully synced booking
        const transaction = db.transaction([this.storeName], 'readwrite');
        const store = transaction.objectStore(this.storeName);
        store.delete(booking.id!);
        
        // Show success notification if available
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Booking Synced', {
            body: 'Your offline booking has been confirmed!',
            icon: '/icons/light_pwa_192x192.png'
          });
        }
      } catch (error) {
        console.error('Failed to sync booking:', booking.id, error);
      }
    }
  }

  // Listen for online events to auto-sync
  setupAutoSync(): void {
    window.addEventListener('online', () => {
      this.syncPendingBookings();
    });
  }
}

export const offlineBookingService = new OfflineBookingService();

// Auto-setup when service is imported
offlineBookingService.setupAutoSync();