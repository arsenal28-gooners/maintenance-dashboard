import React, { useState, useEffect } from 'react';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import { getDatabase, ref, push, onValue, remove } from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js';

// ============================================================
// FIREBASE CONFIG
// ============================================================
const firebaseConfig = {
  apiKey: "AIzaSyBLsTI9jRyn2D9vJlAMK2uJKFJKCHzI9Go",
  authDomain: "maintenance-dashboard-12220.firebaseapp.com",
  databaseURL: "https://maintenance-dashboard-12220-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "maintenance-dashboard-12220",
  storageBucket: "maintenance-dashboard-12220.firebasestorage.app",
  messagingSenderId: "485503196988",
  appId: "1:485503196988:web:a222070589c77a2d750839",
  measurementId: "G-4DHXE85TN1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// ============================================================
// DEMO ASSETS
// ============================================================
const DEMO_ASSETS = [
  { id: 'MK-001', name: 'Mesin Pressing A', lastPM: '2024-11-05', pmInterval: 30 },
  { id: 'MK-002', name: 'Mesin Cutting B', lastPM: '2024-11-08', pmInterval: 30 },
  { id: 'PMP-001', name: 'Pompa Air', lastPM: '2024-10-20', pmInterval: 45 },
  { id: 'GENSET-001', name: 'Generator Set', lastPM: '2024-11-01', pmInterval: 60 },
  { id: 'CONV-001', name: 'Conveyor System', lastPM: '2024-11-10', pmInterval: 30 },
];

// ============================================================
// KOMPONEN UTAMA
// ============================================================
export default function MaintenanceDashboard() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showForm, setShowForm] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedAssetForHistory, setSelectedAssetForHistory] = useState('');

  const [formData, setFormData] = useState({
    assetId: '',
    type: 'PM',
    date: new Date().toISOString().split('T')[0],
    technician: '',
    description: '',
    duration: '',
    component: '',
    photo: null,
  });

  // ============================================================
  // LOAD DATA FROM FIREBASE
  // ============================================================
  useEffect(() => {
    const recordsRef = ref(database, 'maintenance-records');
    
    const unsubscribe = onValue(recordsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const recordsArray = Object.entries(data).map(([key, value]) => ({
          ...value,
          firebaseId: key
        })).sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setRecords(recordsArray);
      } else {
        setRecords([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // ============================================================
  // FUNGSI HELPER
  // ============================================================
  const calculateDaysUntilPM = (assetId) => {
    const asset = DEMO_ASSETS.find(a => a.id === assetId);
    if (!asset) return null;
    
    const lastDate = new Date(asset.lastPM);
    const nextDue = new Date(lastDate);
    nextDue.setDate(nextDue.getDate() + asset.pmInterval);
    
    const today = new Date();
    const daysLeft = Math.ceil((nextDue - today) / (1000 * 60 * 60 * 24));
    return { daysLeft, nextDue, isOverdue: daysLeft < 0 };
  };

  const getOverdueAssets = () => {
    return DEMO_ASSETS.map(asset => {
      const calc = calculateDaysUntilPM(asset.id);
      return { ...asset, ...calc };
    }).filter(a => a.isOverdue || a.daysLeft <= 7);
  };

  const getHistoryByAsset = (assetId) => {
    return records
      .filter(r => r.assetId === assetId)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const getAssetStats = (assetId) => {
    const assetRecords = records.filter(r => r.assetId === assetId);
    const pmCount = assetRecords.filter(r => r.type === 'PM').length;
    const cmCount = assetRecords.filter(r => r.type === 'CM').length;
    const totalDuration = assetRecords.reduce((sum, r) => sum + parseFloat(r.duration || 0), 0);
    
    return {
      total: assetRecords.length,
      pm: pmCount,
      cm: cmCount,
      totalDuration: totalDuration.toFixed(1),
      lastMaintenance: assetRecords.length > 0 ? assetRecords[0].date : 'N/A',
    };
  };

  const handleAddRecord = async () => {
    if (!formData.assetId || !formData.technician || !formData.description) {
      alert('Isi semua field yang diperlukan!');
      return;
    }

    const newRecord = {
      ...formData,
      assetName: DEMO_ASSETS.find(a => a.id === formData.assetId)?.name || formData.assetId,
      status: 'Completed',
      timestamp: new Date().toISOString(),
    };

    try {
      // Push ke Firebase
      const recordsRef = ref(database, 'maintenance-records');
      await push(recordsRef, newRecord);

      // Reset form
      setFormData({
        assetId: '',
        type: 'PM',
        date: new Date().toISOString().split('T')[0],
        technician: '',
        description: '',
        duration: '',
        component: '',
        photo: null,
      });
      setShowForm(false);
      alert('✅ Data berhasil disimpan!');
    } catch (error) {
      console.error('Error saving record:', error);
      alert('❌ Error menyimpan data: ' + error.message);
    }
  };

  const handleDeleteRecord = async (firebaseId) => {
    if (window.confirm('Hapus record ini?')) {
      try {
        const recordRef = ref(database, `maintenance-records/${firebaseId}`);
        await remove(recordRef);
        alert('✅ Data berhasil dihapus!');
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('❌ Error menghapus data: ' + error.message);
      }
    }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, photo: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  // ============================================================
  // DATA UNTUK CHARTS
  // ============================================================
  const getTechnicianData = () => {
    const tech = {};
    records.forEach(r => {
      tech[r.technician] = (tech[r.technician] || 0) + 1;
    });
    return Object.entries(tech).map(([name, count]) => ({ name, count }));
  };

  const SimpleBarChart = ({ data, maxValue = 15 }) => {
    return (
      <div className="space-y-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3">
            <div className="w-20 text-sm font-semibold text-right">{item.name}</div>
            <div className="flex-1 bg-gray-200 rounded-full h-6 overflow-hidden">
              <div
                className="bg-blue-500 h-full"
                style={{ width: `${(item.count / maxValue) * 100}%` }}
              ></div>
            </div>
            <div className="w-8 text-sm font-semibold">{item.count}</div>
          </div>
        ))}
      </div>
    );
  };

  const overdueAssets = getOverdueAssets();
  const pmCount = records.filter(r => r.type === 'PM').length;
  const cmCount = records.filter(r => r.type === 'CM').length;

  // ============================================================
  // UI: MOBILE MENU
  // ============================================================
  const renderMobileMenu = () => (
    <div className="md:hidden fixed top-0 left-0 right-0 bottom-0 bg-white z-50 flex flex-col">
      <div className="flex justify-between items-center p-4 border-b">
        <h1 className="text-xl font-bold">Maintenance</h1>
        <button onClick={() => setMobileMenu(false)}>✕</button>
      </div>
      <div className="flex-1 p-4 space-y-2">
        <button
          onClick={() => { setActiveTab('dashboard'); setMobileMenu(false); }}
          className={`w-full text-left p-3 rounded ${activeTab === 'dashboard' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
        >
          Dashboard
        </button>
        <button
          onClick={() => { setActiveTab('input'); setMobileMenu(false); }}
          className={`w-full text-left p-3 rounded ${activeTab === 'input' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
        >
          Input Maintenance
        </button>
        <button
          onClick={() => { setActiveTab('history'); setMobileMenu(false); }}
          className={`w-full text-left p-3 rounded ${activeTab === 'history' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
        >
          History
        </button>
        <button
          onClick={() => { setActiveTab('asset-history'); setMobileMenu(false); }}
          className={`w-full text-left p-3 rounded ${activeTab === 'asset-history' ? 'bg-blue-500 text-white' : 'hover:bg-gray-100'}`}
        >
          Asset History
        </button>
      </div>
    </div>
  );

  // ============================================================
  // UI: DASHBOARD TAB
  // ============================================================
  const renderDashboard = () => (
    <div className="space-y-6">
      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-lg">
          <div className="text-sm opacity-90">Total Maintenance</div>
          <div className="text-3xl font-bold">{records.length}</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-lg">
          <div className="text-sm opacity-90">Preventive (PM)</div>
          <div className="text-3xl font-bold">{pmCount}</div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-6 rounded-lg">
          <div className="text-sm opacity-90">Corrective (CM)</div>
          <div className="text-3xl font-bold">{cmCount}</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-500 to-orange-600 text-white p-6 rounded-lg">
          <div className="text-sm opacity-90">Asset Overdue/Alert</div>
          <div className="text-3xl font-bold">{overdueAssets.length}</div>
        </div>
      </div>

      {/* OVERDUE ALERT */}
      {overdueAssets.length > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-bold text-yellow-800">Ada Maintenance Overdue/Alert</h3>
              <div className="mt-2 space-y-1 text-sm text-yellow-700">
                {overdueAssets.map(asset => (
                  <div key={asset.id}>
                    • <strong>{asset.name}</strong> ({asset.id}): {asset.isOverdue ? 'OVERDUE ⛔' : `${asset.daysLeft} hari lagi ⏰`}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SIMPLE CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PM vs CM */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="font-bold text-lg mb-6">PM vs CM Ratio</h3>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Preventive (PM)</span>
                <span className="text-lg font-bold text-green-600">{pmCount}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                <div
                  className="bg-green-500 h-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ width: `${pmCount > 0 ? (pmCount / (pmCount + cmCount + 1)) * 100 : 0}%` }}
                >
                  {pmCount > 0 && `${Math.round((pmCount / (pmCount + cmCount)) * 100)}%`}
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="font-semibold">Corrective (CM)</span>
                <span className="text-lg font-bold text-red-600">{cmCount}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                <div
                  className="bg-red-500 h-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ width: `${cmCount > 0 ? (cmCount / (pmCount + cmCount + 1)) * 100 : 0}%` }}
                >
                  {cmCount > 0 && `${Math.round((cmCount / (pmCount + cmCount)) * 100)}%`}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-700">
            💡 Target: PM 80%, CM 20%
          </div>
        </div>

        {/* Breakdown per Teknisi */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <h3 className="font-bold text-lg mb-6">Maintenance per Teknisi</h3>
          {getTechnicianData().length > 0 ? (
            <SimpleBarChart data={getTechnicianData()} />
          ) : (
            <p className="text-gray-500 text-center py-8">Belum ada data</p>
          )}
        </div>
      </div>

      {/* SUMMARY TABLE */}
      <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
        <h3 className="font-bold text-lg mb-4">📊 Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="p-4 bg-gray-50 rounded">
            <div className="text-sm text-gray-600">Total Records</div>
            <div className="text-2xl font-bold text-blue-600">{records.length}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded">
            <div className="text-sm text-gray-600">PM Success Rate</div>
            <div className="text-2xl font-bold text-green-600">
              {pmCount + cmCount > 0 ? Math.round((pmCount / (pmCount + cmCount)) * 100) : 0}%
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded">
            <div className="text-sm text-gray-600">Total Teknisi</div>
            <div className="text-2xl font-bold text-purple-600">{getTechnicianData().length}</div>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // UI: ASSET HISTORY TAB
  // ============================================================
  const renderAssetHistory = () => {
    const selectedAsset = DEMO_ASSETS.find(a => a.id === selectedAssetForHistory);
    const assetRecords = selectedAssetForHistory ? getHistoryByAsset(selectedAssetForHistory) : [];
    const assetStats = selectedAssetForHistory ? getAssetStats(selectedAssetForHistory) : null;

    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">🏷️ Historical by Tag Number</h2>

        {/* Asset Selector */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
          <label className="block text-sm font-semibold mb-3">Pilih Asset / Equipment</label>
          <select
            value={selectedAssetForHistory}
            onChange={(e) => setSelectedAssetForHistory(e.target.value)}
            className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Pilih Asset untuk lihat history --</option>
            {DEMO_ASSETS.map(asset => (
              <option key={asset.id} value={asset.id}>
                {asset.name} ({asset.id})
              </option>
            ))}
          </select>
        </div>

        {/* Asset Stats */}
        {selectedAsset && assetStats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg">
              <div className="text-sm opacity-90">Total Maintenance</div>
              <div className="text-3xl font-bold">{assetStats.total}</div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg">
              <div className="text-sm opacity-90">Preventive (PM)</div>
              <div className="text-3xl font-bold">{assetStats.pm}</div>
            </div>
            <div className="bg-gradient-to-br from-red-500 to-red-600 text-white p-4 rounded-lg">
              <div className="text-sm opacity-90">Corrective (CM)</div>
              <div className="text-3xl font-bold">{assetStats.cm}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg">
              <div className="text-sm opacity-90">Total Duration</div>
              <div className="text-3xl font-bold">{assetStats.totalDuration}h</div>
            </div>
          </div>
        )}

        {/* Asset Info */}
        {selectedAsset && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="font-bold text-lg mb-4">📋 Equipment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Equipment Name</div>
                <div className="text-lg font-bold">{selectedAsset.name}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Tag Number</div>
                <div className="text-lg font-bold">{selectedAsset.id}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">PM Interval</div>
                <div className="text-lg font-bold">{selectedAsset.pmInterval} hari</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Last Maintenance</div>
                <div className="text-lg font-bold">{assetStats?.lastMaintenance || 'N/A'}</div>
              </div>
            </div>
          </div>
        )}

        {/* History List */}
        {selectedAsset && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="font-bold text-lg mb-4">📜 Maintenance History - {selectedAsset.name}</h3>
            
            {assetRecords.length === 0 ? (
              <p className="text-center py-8 text-gray-500">Belum ada record maintenance untuk asset ini</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {assetRecords.map((record, idx) => (
                  <div key={record.firebaseId} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="font-bold">#{idx + 1} - {record.date}</div>
                        <div className="text-sm text-gray-600">👤 {record.technician}</div>
                      </div>
                      <div className="flex gap-2">
                        <span className={`px-3 py-1 rounded-full text-white text-xs font-semibold ${record.type === 'PM' ? 'bg-green-500' : 'bg-red-500'}`}>
                          {record.type}
                        </span>
                        <button
                          onClick={() => handleDeleteRecord(record.firebaseId)}
                          className="text-red-500 text-xs hover:text-red-700"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    <p className="text-sm mb-2">{record.description}</p>
                    <div className="flex gap-3 text-xs text-gray-600">
                      <span>⏱️ {record.duration}h</span>
                      <span>🔩 {record.component}</span>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedRecord(record);
                        setShowDetail(true);
                      }}
                      className="text-blue-500 text-sm mt-2"
                    >
                      Lihat detail →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chart: PM vs CM untuk Asset ini */}
        {selectedAsset && assetStats && assetStats.total > 0 && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="font-bold text-lg mb-6">PM vs CM Trend</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">Preventive (PM)</span>
                  <span className="text-lg font-bold text-green-600">{assetStats.pm}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                  <div
                    className="bg-green-500 h-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ width: `${(assetStats.pm / assetStats.total) * 100}%` }}
                  >
                    {`${Math.round((assetStats.pm / assetStats.total) * 100)}%`}
                  </div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-2">
                  <span className="font-semibold">Corrective (CM)</span>
                  <span className="text-lg font-bold text-red-600">{assetStats.cm}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden">
                  <div
                    className="bg-red-500 h-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ width: `${(assetStats.cm / assetStats.total) * 100}%` }}
                  >
                    {`${Math.round((assetStats.cm / assetStats.total) * 100)}%`}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // ============================================================
  // UI: INPUT FORM
  // ============================================================
  const renderInputForm = () => (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <h2 className="text-2xl font-bold mb-6">➕ Input Maintenance Record</h2>

        <div className="space-y-4">
          {/* Asset Selection */}
          <div>
            <label className="block text-sm font-semibold mb-2">Asset / Equipment</label>
            <select
              value={formData.assetId}
              onChange={(e) => setFormData({ ...formData, assetId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Pilih Asset --</option>
              {DEMO_ASSETS.map(asset => (
                <option key={asset.id} value={asset.id}>
                  {asset.name} ({asset.id})
                </option>
              ))}
            </select>
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-semibold mb-2">Tipe Maintenance</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="PM"
                  checked={formData.type === 'PM'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                />
                <span>Preventive (PM)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="CM"
                  checked={formData.type === 'CM'}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                />
                <span>Corrective (CM)</span>
              </label>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-semibold mb-2">📅 Tanggal</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Technician */}
          <div>
            <label className="block text-sm font-semibold mb-2">👤 Nama Teknisi</label>
            <input
              type="text"
              placeholder="Contoh: Budi, Andi, Roni"
              value={formData.technician}
              onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold mb-2">🔧 Deskripsi Pekerjaan</label>
            <textarea
              placeholder="Contoh: Ganti oli mesin, bersihkan filter, dll"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows="3"
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Component */}
          <div>
            <label className="block text-sm font-semibold mb-2">🔩 Komponen yang Diganti</label>
            <input
              type="text"
              placeholder="Contoh: Oil Filter, Oil, Belt"
              value={formData.component}
              onChange={(e) => setFormData({ ...formData, component: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-semibold mb-2">⏱️ Durasi (jam)</label>
            <input
              type="number"
              step="0.5"
              placeholder="Contoh: 2 atau 1.5"
              value={formData.duration}
              onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="block text-sm font-semibold mb-2">📸 Foto Pekerjaan (Opsional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-blue-500"
            />
            {formData.photo && (
              <img src={formData.photo} alt="Preview" className="mt-3 max-h-48 rounded-lg" />
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleAddRecord}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 rounded-lg transition"
            >
              ✓ Simpan Record
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-3 rounded-lg transition"
            >
              Batal
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ============================================================
  // UI: HISTORY TAB
  // ============================================================
  const renderHistory = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">📋 Maintenance History (All)</h2>
      
      {loading ? (
        <div className="text-center py-12 text-gray-500">
          <p>⏳ Loading data dari Firebase...</p>
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>Belum ada record maintenance</p>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map(record => (
            <div key={record.firebaseId} className="bg-white p-4 rounded-lg shadow border border-gray-200 hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-lg">{record.assetName} ({record.assetId})</h3>
                  <p className="text-sm text-gray-600">{record.date} • {record.technician}</p>
                </div>
                <div className="flex gap-2">
                  <span className={`px-3 py-1 rounded-full text-white text-sm font-semibold ${record.type === 'PM' ? 'bg-green-500' : 'bg-red-500'}`}>
                    {record.type}
                  </span>
                  <button
                    onClick={() => handleDeleteRecord(record.firebaseId)}
                    className="text-red-500 hover:text-red-700"
                    title="Hapus"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              <p className="text-gray-700 mb-2">{record.description}</p>
              <div className="flex gap-4 text-sm text-gray-600 mb-3">
                <span>⏱️ Durasi: <strong>{record.duration} jam</strong></span>
                <span>🔩 Komponen: <strong>{record.component}</strong></span>
              </div>
              <button
                onClick={() => {
                  setSelectedRecord(record);
                  setShowDetail(true);
                }}
                className="text-blue-500 hover:text-blue-700 text-sm font-semibold"
              >
                👁️ Lihat Detail
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ============================================================
  // UI: DETAIL MODAL
  // ============================================================
  if (showDetail && selectedRecord) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-40">
        <div className="bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4">📋 Detail Maintenance</h2>
            <div className="space-y-3 text-sm">
              <div>
                <strong>Asset:</strong> {selectedRecord.assetName} ({selectedRecord.assetId})
              </div>
              <div>
                <strong>Tipe:</strong> {selectedRecord.type === 'PM' ? '✓ Preventive' : '⚠️ Corrective'}
              </div>
              <div>
                <strong>Tanggal:</strong> {selectedRecord.date}
              </div>
              <div>
                <strong>Teknisi:</strong> {selectedRecord.technician}
              </div>
              <div>
                <strong>Deskripsi:</strong> {selectedRecord.description}
              </div>
              <div>
                <strong>Komponen:</strong> {selectedRecord.component}
              </div>
              <div>
                <strong>Durasi:</strong> {selectedRecord.duration} jam
              </div>
              {selectedRecord.photo && (
                <div>
                  <strong>Foto:</strong>
                  <img src={selectedRecord.photo} alt="Maintenance" className="mt-2 w-full rounded" />
                </div>
              )}
            </div>
            <button
              onClick={() => setShowDetail(false)}
              className="w-full mt-6 bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 rounded-lg"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================
  return (
    <div className="min-h-screen bg-gray-100">
      {/* HEADER */}
      <header className="bg-white shadow sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">🔧 Maintenance Dashboard</h1>
          <button
            onClick={() => setMobileMenu(!mobileMenu)}
            className="md:hidden p-2 hover:bg-gray-100 rounded text-2xl"
          >
            ☰
          </button>
        </div>
      </header>

      {/* MOBILE MENU */}
      {mobileMenu && renderMobileMenu()}

      {/* MAIN CONTENT */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* DESKTOP TABS */}
        <div className="hidden md:flex gap-4 mb-6 flex-wrap">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-6 py-3 font-semibold rounded-lg transition ${
              activeTab === 'dashboard'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => { setActiveTab('input'); setShowForm(true); }}
            className={`px-6 py-3 font-semibold rounded-lg transition ${
              activeTab === 'input'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            ➕ Input Maintenance
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-3 font-semibold rounded-lg transition ${
              activeTab === 'history'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            📋 History
          </button>
          <button
            onClick={() => setActiveTab('asset-history')}
            className={`px-6 py-3 font-semibold rounded-lg transition ${
              activeTab === 'asset-history'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'
            }`}
          >
            🏷️ Asset History
          </button>
        </div>

        {/* MOBILE TABS */}
        <div className="md:hidden flex gap-2 mb-6 flex-wrap">
          <button
            onClick={() => { setActiveTab('dashboard'); setMobileMenu(false); }}
            className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg ${
              activeTab === 'dashboard'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            📊
          </button>
          <button
            onClick={() => { setActiveTab('input'); setShowForm(true); setMobileMenu(false); }}
            className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg ${
              activeTab === 'input'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            ➕
          </button>
          <button
            onClick={() => { setActiveTab('history'); setMobileMenu(false); }}
            className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg ${
              activeTab === 'history'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            📋
          </button>
          <button
            onClick={() => { setActiveTab('asset-history'); setMobileMenu(false); }}
            className={`flex-1 px-3 py-2 text-sm font-semibold rounded-lg ${
              activeTab === 'asset-history'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            🏷️
          </button>
        </div>

        {/* CONTENT */}
        {showForm && renderInputForm()}
        {!showForm && activeTab === 'dashboard' && renderDashboard()}
        {!showForm && activeTab === 'history' && renderHistory()}
        {!showForm && activeTab === 'asset-history' && renderAssetHistory()}
      </main>
    </div>
  );
}