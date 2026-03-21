import { useState } from 'react';
import api from '../services/api';

const inputCls = 'w-full border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent bg-white';
const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5';

export default function CustomerForm({ customer, onSave, onCancel }) {
  const [form, setForm] = useState({
    name:  customer?.name  || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    notes: customer?.notes || '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (customer?._id) {
        await api.put(`/customers/${customer._id}`, form);
      } else {
        await api.post('/customers', form);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al guardar');
    }
  };

  const field = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-3 py-2">
          {error}
        </div>
      )}

      <div>
        <label className={labelCls}>Nombre *</label>
        <input required value={form.name} onChange={field('name')}
          placeholder="Nombre completo"
          className={inputCls} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Teléfono <span className="text-gray-400 font-normal">(opcional)</span></label>
          <input value={form.phone} onChange={field('phone')}
            placeholder="+34 600 000 000"
            className={inputCls} />
        </div>
        <div>
          <label className={labelCls}>Email <span className="text-gray-400 font-normal">(opcional)</span></label>
          <input type="email" value={form.email} onChange={field('email')}
            placeholder="email@ejemplo.com"
            className={inputCls} />
        </div>
      </div>

      <div>
        <label className={labelCls}>Notas <span className="text-gray-400 font-normal">(opcional)</span></label>
        <textarea value={form.notes} onChange={field('notes')} rows={2}
          placeholder="Alergias, preferencias, notas..."
          className={`${inputCls} resize-none`} />
      </div>

      <div className="flex gap-3 pt-1">
        <button type="submit"
          className="flex-1 bg-violet-600 hover:bg-violet-700 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
          {customer ? 'Guardar cambios' : 'Crear cliente'}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm font-medium transition-colors">
          Cancelar
        </button>
      </div>
    </form>
  );
}
