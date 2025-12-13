import React from 'react';

interface BookingConfirmationEmailProps {
  customerName: string;
  propertyName: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  totalPrice: number;
  bookingId: string;
}

const BookingConfirmationEmail: React.FC<BookingConfirmationEmailProps> = ({ 
  customerName, 
  propertyName, 
  checkInDate, 
  checkOutDate, 
  numberOfGuests, 
  totalPrice, 
  bookingId 
}) => {
  const emailStyles = {
    body: {
      fontFamily: 'sans-serif',
      backgroundColor: '#f4f4f4',
      margin: 0,
      padding: '20px',
    },
    container: {
      backgroundColor: '#ffffff',
      border: '1px solid #dddddd',
      borderRadius: '8px',
      maxWidth: '600px',
      margin: '0 auto',
      padding: '20px',
    },
    header: {
      textAlign: 'center' as const,
      paddingBottom: '20px',
    },
    logo: {
      maxWidth: '150px',
    },
    content: {
      lineHeight: '1.6',
    },
    footer: {
      textAlign: 'center' as const,
      paddingTop: '20px',
      fontSize: '12px',
      color: '#888888',
    },
    h1: {
      color: '#333333',
    },
    p: {
      color: '#555555',
    },
    strong: {
      color: '#333333',
    }
  };

  return (
    <div style={emailStyles.body}>
      <div style={emailStyles.container}>
        <div style={emailStyles.header}>
          <img src="https://hiddystays.com/icons/light_email_400px.png" alt="HiddyStays" style={emailStyles.logo} />
          <h1 style={emailStyles.h1}>Booking Confirmation</h1>
        </div>
        <div style={emailStyles.content}>
          <p style={emailStyles.p}>Dear {customerName},</p>
          <p style={emailStyles.p}>Thank you for booking with Zero Fee Stays! Your booking is confirmed.</p>
          <h2 style={{...emailStyles.h1, fontSize: '18px'}}>Booking Details</h2>
          <p style={emailStyles.p}><strong>Booking ID:</strong> {bookingId}</p>
          <p style={emailStyles.p}><strong>Property:</strong> {propertyName}</p>
          <p style={emailStyles.p}><strong>Check-in:</strong> {checkInDate}</p>
          <p style={emailStyles.p}><strong>Check-out:</strong> {checkOutDate}</p>
          <p style={emailStyles.p}><strong>Guests:</strong> {numberOfGuests}</p>
          <h2 style={{...emailStyles.h1, fontSize: '18px'}}>Price Details</h2>
          <p style={emailStyles.p}><strong>Total Price:</strong> ${totalPrice}</p>
          <p style={emailStyles.p}>We look forward to hosting you!</p>
        </div>
        <div style={emailStyles.footer}>
          <p>&copy; {new Date().getFullYear()} Zero Fee Stays. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmationEmail;
