import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import publicApi from '../services/publicApi';

// Helper to pull query params
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

export default function PublicCancel() {
  const query = useQuery();
  const reservationId = query.get('reservationId');
  const email = query.get('email');
  const [status, setStatus] = useState('loading'); // loading, ready, cancelling, success, error
  const [message, setMessage] = useState('');
  const [reservation, setReservation] = useState(null);

  useEffect(() => {
    if (!reservationId || !email) {
      setStatus('error');
      setMessage('Enlace inválido.');
      return;
    }

    // First, get reservation details
    publicApi.get('/reservations/public/details', {
      params: { reservationId, email }
    })
      .then(res => {
        setReservation(res.data);
        setStatus('ready');
      })
      .catch(err => {
        setStatus('error');
        setMessage(err.response?.data?.message || 'No se pudo encontrar la reserva.');
      });
  }, [reservationId, email]);

  const handleCancel = () => {
    setStatus('cancelling');
    setMessage('Cancelando reserva...');

    publicApi.get('/reservations/public/cancel', {
      params: { reservationId, email }
    })
      .then(res => {
        setStatus('success');
        setMessage(res.data.message || 'Reserva cancelada con éxito.');
      })
      .catch(err => {
        const errorMessage = err.response?.data?.message || 'No se pudo cancelar la reserva.';
        // Si la reserva ya estaba cancelada, mostrar como éxito en verde
        if (errorMessage.includes('ya ha sido cancelada')) {
          setStatus('success');
          setMessage(errorMessage);
        } else {
          setStatus('error');
          setMessage(errorMessage);
        }
      });
  };

  let body;
  if (status === 'loading') {
    body = <p className="text-gray-600">Cargando detalles de la reserva...</p>;
  } else if (status === 'ready' && reservation) {
    body = (
      <div className="text-left">
        <p className="text-gray-700 mb-4">
          ¿Estás seguro de que quieres cancelar esta reserva?
        </p>
        <div className="bg-gray-50 p-4 rounded-lg mb-6">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div><strong>Fecha:</strong> {reservation.date}</div>
            <div><strong>Hora:</strong> {reservation.time}</div>
            <div><strong>Personas:</strong> {reservation.people}</div>
            <div><strong>Estado:</strong> {reservation.status === 'confirmed' ? 'Confirmada' : reservation.status}</div>
          </div>
          {reservation.roomId && <div className="mt-2"><strong>Sala:</strong> {reservation.roomId.name}</div>}
          {reservation.notes && <div className="mt-2"><strong>Notas:</strong> {reservation.notes}</div>}
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            disabled={status === 'cancelling'}
            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {status === 'cancelling' ? 'Cancelando...' : 'Sí, cancelar reserva'}
          </button>
          <Link
            to="/"
            className="flex-1 text-center bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300"
          >
            No, mantener reserva
          </Link>
        </div>
      </div>
    );
  } else if (status === 'cancelling') {
    body = <p className="text-gray-600">{message}</p>;
  } else if (status === 'success') {
    body = (
      <>
        <p className="text-green-600 font-semibold mb-4">{message}</p>
        <Link to="/" className="text-violet-600 hover:underline">Volver al inicio</Link>
      </>
    );
  } else {
    body = (
      <>
        <p className="text-red-600 font-semibold mb-4">{message}</p>
        <Link to="/" className="text-violet-600 hover:underline">Volver al inicio</Link>
      </>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold mb-6">Cancelar reserva</h1>
        {body}
      </div>
    </div>
  );
}