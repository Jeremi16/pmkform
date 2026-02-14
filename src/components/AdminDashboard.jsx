import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Download, Filter, ArrowUpDown, LogOut, RefreshCw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import departmentsData from '../data/departments.json';

const AdminDashboard = () => {
    const [allRegistrations, setAllRegistrations] = useState([]);
    const [registrations, setRegistrations] = useState([]);
    const [filters, setFilters] = useState({ dept: '', div: '', sort_by: 'created_at', order: 'DESC' });
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchRegistrations = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            // Fetch ALL data without filters
            const response = await axios.get('/api/registrations', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAllRegistrations(response.data);
        } catch (error) {
            console.error('Error fetching data:', error);
            if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                localStorage.removeItem('adminToken');
                navigate('/masukeuy');
            }
        } finally {
            setLoading(false);
        }
    };

    // Initial fetch
    useEffect(() => {
        fetchRegistrations();
    }, []);

    // Client-side Filter & Sort
    useEffect(() => {
        let result = [...allRegistrations];

        // Filter by Dept
        if (filters.dept) {
            result = result.filter(r => r.dept1 === filters.dept || r.dept2 === filters.dept);
        }

        // Filter by Div
        if (filters.div) {
            result = result.filter(r => r.div1 === filters.div || r.div2 === filters.div);
        }

        // Sort
        result.sort((a, b) => {
            let valA = a[filters.sort_by];
            let valB = b[filters.sort_by];

            // Handle strings case-insensitive
            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return filters.order === 'ASC' ? -1 : 1;
            if (valA > valB) return filters.order === 'ASC' ? 1 : -1;
            return 0;
        });

        setRegistrations(result);
    }, [allRegistrations, filters]);

    const handleRefresh = () => {
        fetchRegistrations();
    };

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        navigate('/masukeuy');
    };

    const handleExport = async (type) => {
        try {
            const token = localStorage.getItem('adminToken');
            const url = type === 'xlsx' ? '/api/export/xlsx' : '/api/export';
            const filename = type === 'xlsx' ? 'OPREC BPH PMK ITERA 2026.xlsx' : 'registrations.csv';

            const response = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` },
                responseType: 'blob'
            });

            const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = blobUrl;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
        } catch (error) {
            console.error('Export failed', error);
        }
    };

    const handleFilterChange = (e) => {
        setFilters({ ...filters, [e.target.name]: e.target.value });
    };

    const handleSort = (column) => {
        setFilters(prev => ({
            ...prev,
            sort_by: column,
            order: prev.sort_by === column && prev.order === 'DESC' ? 'ASC' : 'DESC'
        }));
    };

    const getDivisions = (deptId) => {
        const dept = departmentsData.find(d => d.id === deptId);
        return dept ? dept.divisions : [];
    };

    const getDepartmentName = (id) => {
        if (!id) return '-';
        const dept = departmentsData.find(d => d.id === id);
        return dept ? dept.name : id;
    };

    const getDivisionName = (deptId, divId) => {
        if (!deptId || !divId) return '-';
        const dept = departmentsData.find(d => d.id === deptId);
        if (!dept) return divId;
        const div = dept.divisions.find(d => d.id === divId);
        return div ? div.name : divId;
    };

    return (
        <div className="max-w-7xl mx-auto p-6">
            <h1 className="text-3xl font-serif font-bold text-brown-800 mb-6">Admin Dashboard</h1>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-end">
                <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">Department</label>
                    <select
                        name="dept"
                        value={filters.dept}
                        onChange={handleFilterChange}
                        className="border rounded px-3 py-2"
                    >
                        <option value="">All Departments</option>
                        {departmentsData.map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 mb-1">Division</label>
                    <select
                        name="div"
                        value={filters.div}
                        onChange={handleFilterChange}
                        className="border rounded px-3 py-2"
                        disabled={!filters.dept}
                    >
                        <option value="">All Divisions</option>
                        {getDivisions(filters.dept).map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))}
                    </select>
                </div>

                <div className="ml-auto flex gap-2">
                    <button
                        onClick={handleRefresh}
                        className="bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-700 transition"
                        disabled={loading}
                    >
                        <RefreshCw size={16} className={loading ? "animate-spin" : ""} /> Refresh
                    </button>
                    <button
                        onClick={() => handleExport('csv')}
                        className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-green-700 transition"
                    >
                        <Download size={16} /> CSV
                    </button>
                    <button
                        onClick={() => handleExport('xlsx')}
                        className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 transition"
                    >
                        <Download size={16} /> Excel
                    </button>
                </div>
                <button
                    onClick={handleLogout}
                    className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-red-700 transition"
                >
                    <LogOut size={16} /> Logout
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-100 border-b">
                            <th className="p-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('name')}>
                                <div className="flex items-center gap-1">Name <ArrowUpDown size={14} /></div>
                            </th>
                            <th className="p-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('nim')}>
                                <div className="flex items-center gap-1">NIM <ArrowUpDown size={14} /></div>
                            </th>
                            <th className="p-4 font-semibold text-gray-700">Email / WA</th>
                            <th className="p-4 font-semibold text-gray-700">Pilihan ke-1</th>
                            <th className="p-4 font-semibold text-gray-700">Pilihan ke-2</th>
                            <th className="p-4 font-semibold text-gray-700 cursor-pointer hover:bg-gray-200" onClick={() => handleSort('created_at')}>
                                <div className="flex items-center gap-1">Registered At <ArrowUpDown size={14} /></div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" className="p-8 text-center text-gray-500">Loading...</td></tr>
                        ) : registrations.length === 0 ? (
                            <tr><td colSpan="6" className="p-8 text-center text-gray-500">No registrations found.</td></tr>
                        ) : (
                            registrations.map(reg => (
                                <tr key={reg.id} className="border-b hover:bg-gray-50">
                                    <td className="p-4 font-medium text-gray-900">{reg.name}</td>
                                    <td className="p-4 text-gray-600">{reg.nim}</td>
                                    <td className="p-4 text-sm text-gray-600">
                                        <div>{reg.email}</div>
                                        <div className="text-green-600">{reg.whatsapp}</div>
                                    </td>
                                    <td className="p-4 text-sm">
                                        <div className="font-medium">{getDepartmentName(reg.dept1)}</div>
                                        <div className="text-gray-500">{getDivisionName(reg.dept1, reg.div1)}</div>
                                    </td>
                                    <td className="p-4 text-sm">
                                        <div className="font-medium">{getDepartmentName(reg.dept2)}</div>
                                        <div className="text-gray-500">{getDivisionName(reg.dept2, reg.div2)}</div>
                                    </td>
                                    <td className="p-4 text-sm text-gray-500">
                                        {new Date(reg.created_at).toLocaleString('id-ID', {
                                            timeZone: 'Asia/Jakarta',
                                            day: 'numeric',
                                            month: 'long',
                                            year: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            second: '2-digit'
                                        })}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default AdminDashboard;
