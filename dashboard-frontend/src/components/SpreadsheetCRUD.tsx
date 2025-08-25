"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Search,
  Save,
  X,
  Users,
  Baby,
  Home,
  RefreshCw,
  Check,
  Trash2,
  Calendar,
  ClipboardList,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { adultsService, childrenService, householdsService, programsService } from "@/lib/crud-services";
import { 
  AdultRecord, 
  ChildRecord, 
  HouseholdRecord,
  ProgramRecord,
  AdultCreate,
  ChildCreate,
  HouseholdCreate,
  ProgramCreate,
} from "@/types/crud-models";

interface EditableCell {
  isEditing: boolean;
  value: string | number | boolean | null;
  originalValue: string | number | boolean | null;
}

interface SpreadsheetCRUDProps {
  onClose?: () => void;
}

type AnyRecord = { [key: string]: any };

export function SpreadsheetCRUD(_props: SpreadsheetCRUDProps) {
  const [activeTab, setActiveTab] = useState("adults");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Data states - now storing all longitudinal data
  const [adults, setAdults] = useState<AdultRecord[]>([]);
  const [children, setChildren] = useState<ChildRecord[]>([]);
  const [households, setHouseholds] = useState<HouseholdRecord[]>([]);
  const [programs, setPrograms] = useState<ProgramRecord[]>([]);

  // Grouped data for display (latest record per person/child)
  const [groupedAdults, setGroupedAdults] = useState<Map<string, AdultRecord[]>>(new Map());
  const [groupedChildren, setGroupedChildren] = useState<Map<string, ChildRecord[]>>(new Map());
  const [groupedPrograms, setGroupedPrograms] = useState<Map<string, ProgramRecord[]>>(new Map());

  // Expanded rows tracking for time series view
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [expandedChildren, setExpandedChildren] = useState<Set<string>>(new Set());
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());

  // Editing states
  const [editingCells, setEditingCells] = useState<{[key: string]: EditableCell}>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [newRows, setNewRows] = useState<Record<string, any>>({});

  // Fetch data - get all longitudinal data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [adultsData, childrenData, householdsData, programsData] = await Promise.all([
        adultsService.getAll(1, 5000, false), // Get ALL data without grouping for time series
        childrenService.getAll(1, 5000, false), // Get ALL data without grouping for time series
        householdsService.getAll(1, 1000),
        programsService.getAll(1, 10000), // Increase limit to get all 6621+ program records
      ]);
      
      // Store all longitudinal data
      const allAdults = adultsData.items || [];
      const allChildren = childrenData.items || [];
      const allPrograms = programsData.items || [];
      
      setAdults(allAdults);
      setChildren(allChildren);
      setHouseholds(householdsData.items || []);
      setPrograms(allPrograms);

      // Group adults by person_id for time series display
      const adultsMap = new Map<string, AdultRecord[]>();
      allAdults.forEach(record => {
        if (!adultsMap.has(record.person_id)) {
          adultsMap.set(record.person_id, []);
        }
        adultsMap.get(record.person_id)!.push(record);
      });
      
      // Sort each person's records by date (newest first)
      adultsMap.forEach(records => {
        records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });
      
      setGroupedAdults(adultsMap);

      // Group children by child_id for time series display
      const childrenMap = new Map<string, ChildRecord[]>();
      allChildren.forEach(record => {
        if (!childrenMap.has(record.child_id)) {
          childrenMap.set(record.child_id, []);
        }
        childrenMap.get(record.child_id)!.push(record);
      });
      
      // Sort each child's records by date (newest first)
      childrenMap.forEach(records => {
        records.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      });
      
      setGroupedChildren(childrenMap);

      // Group programs by target_id for time series display
      const programsMap = new Map<string, ProgramRecord[]>();
      allPrograms.forEach(record => {
        if (!programsMap.has(record.target_id)) {
          programsMap.set(record.target_id, []);
        }
        programsMap.get(record.target_id)!.push(record);
      });
      
      // Sort each target's records by date (newest first)
      programsMap.forEach(records => {
        records.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
      });
      
      setGroupedPrograms(programsMap);
      
    } catch (error) {
      console.error("Gagal mengambil data:", error);
      // Set empty arrays as fallback
      setAdults([]);
      setChildren([]);
      setHouseholds([]);
      setPrograms([]);
      setGroupedAdults(new Map());
      setGroupedChildren(new Map());
      setGroupedPrograms(new Map());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Cell editing functions
  const startEditing = (rowId: string, field: string, value: string | number | boolean | null) => {
    const cellKey = `${rowId}-${field}`;
    setEditingCells(prev => ({
      ...prev,
      [cellKey]: {
        isEditing: true,
        value,
        originalValue: value
      }
    }));
  };

  const updateCellValue = (rowId: string, field: string, newValue: string | number | boolean | null) => {
    const cellKey = `${rowId}-${field}`;
    setEditingCells(prev => ({
      ...prev,
      [cellKey]: {
        ...prev[cellKey],
        value: newValue
      }
    }));
    setHasChanges(true);
  };

  const saveCell = async (rowId: string, field: string) => {
    const cellKey = `${rowId}-${field}`;
    const cellData = editingCells[cellKey];
    
    if (!cellData) return;

    try {
      // Update the data based on active tab
      if (activeTab === "adults") {
        const updatedRecord = Array.isArray(adults) ? adults.find(a => a.person_id === rowId) : null;
        if (updatedRecord) {
  (updatedRecord as AnyRecord)[field] = cellData.value;
          await adultsService.update(rowId, updatedRecord);
        }
      } else if (activeTab === "children") {
        const updatedRecord = Array.isArray(children) ? children.find(c => c.child_id === rowId) : null;
        if (updatedRecord) {
  (updatedRecord as AnyRecord)[field] = cellData.value;
          await childrenService.update(rowId, updatedRecord);
        }
      } else if (activeTab === "households") {
        const updatedRecord = Array.isArray(households) ? households.find(h => h.household_id === rowId) : null;
        if (updatedRecord) {
  (updatedRecord as AnyRecord)[field] = cellData.value;
          await householdsService.update(rowId, updatedRecord);
        }
      } else if (activeTab === "programs") {
        const updatedRecord = Array.isArray(programs) ? programs.find(p => p.id?.toString() === rowId) : null;
        if (updatedRecord) {
          (updatedRecord as AnyRecord)[field] = cellData.value;
          await programsService.update(rowId, updatedRecord);
        }
      }

      // Remove from editing state
      setEditingCells(prev => {
        const newState = { ...prev };
        delete newState[cellKey];
        return newState;
      });
      
    } catch (error) {
      console.error("Gagal menyimpan perubahan:", error);
      // Revert to original value on error
      cancelEdit(rowId, field);
    }
  };

  const cancelEdit = (rowId: string, field: string) => {
    const cellKey = `${rowId}-${field}`;
    setEditingCells(prev => {
      const newState = { ...prev };
      delete newState[cellKey];
      return newState;
    });
  };

  // Toggle row expansion for time series view
  const toggleRowExpansion = (personId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(personId)) {
        newSet.delete(personId);
      } else {
        newSet.add(personId);
      }
      return newSet;
    });
  };

  // Toggle child expansion for time series view
  const toggleChildExpansion = (childId: string) => {
    setExpandedChildren(prev => {
      const newSet = new Set(prev);
      if (newSet.has(childId)) {
        newSet.delete(childId);
      } else {
        newSet.add(childId);
      }
      return newSet;
    });
  };

  // Toggle program expansion for time series view
  const toggleProgramExpansion = (targetId: string) => {
    setExpandedPrograms(prev => {
      const newSet = new Set(prev);
      if (newSet.has(targetId)) {
        newSet.delete(targetId);
      } else {
        newSet.add(targetId);
      }
      return newSet;
    });
  };

    // Add a time-series record (duplicate latest with current timestamp)
    const addTimeSeriesRecord = async (id: string, type: 'adults' | 'children' | 'programs') => {
      try {
        if (type === 'adults') {
          const records = groupedAdults.get(id) || [];
          const latest = records[0];
          if (!latest) return;
          const newRecord = { ...latest, date: new Date().toISOString() } as AdultCreate;
          delete (newRecord as any).id;
          await adultsService.create(newRecord);
        } else if (type === 'children') {
          const records = groupedChildren.get(id) || [];
          const latest = records[0];
          if (!latest) return;
          const newRecord = { ...latest, date: new Date().toISOString() } as ChildCreate;
          delete (newRecord as any).id;
          await childrenService.create(newRecord);
        } else if (type === 'programs') {
          const records = groupedPrograms.get(id) || [];
          const latest = records[0];
          if (!latest) return;
          const newRecord = { ...latest, tanggal: new Date().toISOString() } as ProgramCreate;
          delete (newRecord as any).id;
          await programsService.create(newRecord);
        }
        await fetchData();
      } catch (error) {
        console.error('Gagal menambah rekaman time-series:', error);
      }
    };

  const addNewRow = () => {
    const newId = `new-${Date.now()}`;
    let newRow = {};
    
    if (activeTab === "adults") {
      newRow = {
        person_id: "",
        household_id: "",
        date: new Date().toISOString(),
        month: new Date().getMonth() + 1,
        age: 0,
        sistol: 0,
        diastol: 0,
        on_treatment: false,
        diabetes_koin: false,
        perokok: false,
        adherence_current: 0,
      };
    } else if (activeTab === "children") {
      newRow = {
        child_id: "",
        household_id: "",
        date: new Date().toISOString(),
        month: new Date().getMonth() + 1,
        usia_bulan: 0,
        HAZ: 0,
        on_program: false,
        anemia_hb_gdl: null,
        air_bersih: true,
        jamban_sehat: true,
        haz_change_this_month: 0,
      };
    } else if (activeTab === "households") {
      newRow = {
        household_id: "",
        pendapatan_rt: 0,
        kepemilikan_rumah: true,
        akses_listrik: true,
        akses_internet: false,
      };
    } else if (activeTab === "programs") {
      newRow = {
        program: "",
        target_id: "",
        household_id: "",
        tanggal: new Date().toISOString(),
        biaya_riil: 0,
        status: "",
        description: "",
      };
    }

    setNewRows(prev => ({ ...prev, [newId]: newRow }));
  };

  const cancelNewRow = (newId: string) => {
    setNewRows(prev => {
      const newState = { ...prev };
      delete newState[newId];
      return newState;
    });
  };

  const saveNewRow = async (newId: string) => {
    const newRow = newRows[newId];
    if (!newRow) return;

    try {
      setSaving(true);
      if (activeTab === "adults") {
        await adultsService.create(newRow as AdultCreate);
      } else if (activeTab === "children") {
        await childrenService.create(newRow as ChildCreate);
      } else if (activeTab === "households") {
        await householdsService.create(newRow as HouseholdCreate);
      } else if (activeTab === "programs") {
        await programsService.create(newRow as ProgramCreate);
      }

      // Remove from new rows and refresh data
      setNewRows(prev => {
        const newState = { ...prev };
        delete newState[newId];
        return newState;
      });
      
      await fetchData();
    } catch (error) {
      console.error("Gagal menyimpan baris baru:", error);
    } finally {
      setSaving(false);
    }
  };

  const deleteRow = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;

    try {
      if (activeTab === "adults") {
        await adultsService.delete(id);
        setAdults(prev => Array.isArray(prev) ? prev.filter(a => a.person_id !== id) : []);
      } else if (activeTab === "children") {
        await childrenService.delete(id);
        setChildren(prev => Array.isArray(prev) ? prev.filter(c => c.child_id !== id) : []);
      } else if (activeTab === "households") {
        await householdsService.delete(id);
        setHouseholds(prev => Array.isArray(prev) ? prev.filter(h => h.household_id !== id) : []);
      } else if (activeTab === "programs") {
        await programsService.delete(id);
        setPrograms(prev => Array.isArray(prev) ? prev.filter(p => p.id?.toString() !== id) : []);
      }
    } catch (error) {
      console.error("Gagal menghapus data:", error);
    }
  };

  // Render editable cell
  const renderEditableCell = (rowId: string, field: string, value: string | number | boolean | null, type: 'text' | 'number' | 'boolean' | 'date' = 'text') => {
    const cellKey = `${rowId}-${field}`;
    const cellData = editingCells[cellKey];
    const isEditing = cellData?.isEditing || false;
    const displayValue = isEditing ? cellData.value : value;

    if (type === 'boolean') {
      return (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={Boolean(displayValue)}
            onChange={(e) => {
              const checked = e.target.checked;
              if (isEditing) {
                updateCellValue(rowId, field, checked);
              } else {
                startEditing(rowId, field, displayValue);
                updateCellValue(rowId, field, checked);
                setTimeout(() => saveCell(rowId, field), 100);
              }
            }}
            className="h-4 w-4"
          />
        </div>
      );
    }

    if (isEditing) {
      return (
        <div className="flex items-center space-x-1">
          <Input
            type={type === 'number' ? 'number' : type === 'date' ? 'datetime-local' : 'text'}
            value={typeof displayValue === 'boolean' ? (displayValue ? 'true' : 'false') : (displayValue ?? '').toString()}
            onChange={(e) => updateCellValue(rowId, field, type === 'number' ? parseFloat(e.target.value) : e.target.value)}
            className="h-8 text-xs"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                saveCell(rowId, field);
              } else if (e.key === 'Escape') {
                cancelEdit(rowId, field);
              }
            }}
          />
          <Button
            size="sm"
            onClick={() => saveCell(rowId, field)}
            className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
          >
            <Check className="h-3 w-3" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => cancelEdit(rowId, field)}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      );
    }

    return (
      <div
        className="cursor-pointer hover:bg-blue-50 p-1 rounded min-h-[24px] flex items-center"
        onClick={() => startEditing(rowId, field, value)}
      >
        {type === 'date' ? (value ? new Date(value as string).toLocaleDateString('id-ID') : '-') : value?.toString() || '-'}
      </div>
    );
  };

  // Filter data based on search - now working with grouped data
  const filteredAdultsGrouped = Array.from(groupedAdults.entries()).filter(([personId, records]) => {
    const latestRecord = records[0]; // Latest record for search
    return personId.toLowerCase().includes(searchTerm.toLowerCase()) ||
           latestRecord.household_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           Object.values(latestRecord).some(value =>
             value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
           );
  });

  const filteredChildrenGrouped = Array.from(groupedChildren.entries()).filter(([childId, records]) => {
    const latestRecord = records[0]; // Latest record for search
    return childId.toLowerCase().includes(searchTerm.toLowerCase()) ||
           latestRecord.household_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           Object.values(latestRecord).some(value =>
             value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
           );
  });

  const filteredHouseholds = Array.isArray(households) ? households.filter(household =>
    Object.values(household).some(value =>
      value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  ) : [];

  const filteredProgramsGrouped = Array.from(groupedPrograms.entries()).filter(([targetId, records]) => {
    const latestRecord = records[0]; // Latest record for search
    return targetId.toLowerCase().includes(searchTerm.toLowerCase()) ||
           latestRecord.household_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           latestRecord.program?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           Object.values(latestRecord).some(value =>
             value?.toString().toLowerCase().includes(searchTerm.toLowerCase())
           );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-sky-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-full mx-auto space-y-6"
      >
        {/* Header */}
        <Card className="bg-white/80 backdrop-blur-lg shadow-xl border border-blue-200/50">
          <CardHeader className="border-blue-200/50">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-800 to-indigo-800 bg-clip-text text-transparent">
                  Manajemen Data Penduduk
                </CardTitle>
                <p className="text-blue-600 mt-1">Edit data langsung dalam tampilan spreadsheet</p>
              </div>
              <div className="flex items-center space-x-2">
                {hasChanges && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                    Ada perubahan belum disimpan
                  </Badge>
                )}
                <Button
                  onClick={fetchData}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  className="border-blue-200 hover:bg-blue-50"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Muat Ulang
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {/* Search and Actions */}
            <div className="flex items-center justify-between mb-6">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Cari data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/70 border-blue-200 focus:border-blue-400"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  onClick={addNewRow}
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Tambah Baris
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4 bg-white/70 backdrop-blur-lg rounded-xl border border-blue-200/50">
                <TabsTrigger 
                  value="adults"
                  className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                >
                  <Users className="h-4 w-4" />
                  <span>Data Dewasa</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="children"
                  className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                >
                  <Baby className="h-4 w-4" />
                  <span>Data Anak</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="households"
                  className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                >
                  <Home className="h-4 w-4" />
                  <span>Data Rumah Tangga</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="programs"
                  className="flex items-center space-x-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white"
                >
                  <ClipboardList className="h-4 w-4" />
                  <span>Data Program</span>
                </TabsTrigger>
              </TabsList>

              {/* Adults Table - Longitudinal View */}
              <TabsContent value="adults" className="mt-6">
                <div className="border border-blue-200/50 rounded-xl overflow-hidden bg-white/90 backdrop-blur-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider w-8"></th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">ID Orang</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">ID Rumah Tangga</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Tanggal</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Bulan</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Usia</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Sistol</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Diastol</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Dalam Pengobatan</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Diabetes</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Perokok</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Kepatuhan</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-100">
                        {/* New rows */}
                        {Object.entries(newRows).filter(() => activeTab === "adults").map(([newId, newRow]) => (
                          <tr key={newId} className="hover:bg-blue-50/50 bg-green-50/30">
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center">
                                <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                                  <Plus className="h-2 w-2 text-white" />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                value={(newRow as any).person_id || ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], person_id: e.target.value }
                                }))}
                                placeholder="ID Orang"
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                value={(newRow as any).household_id || ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], household_id: e.target.value }
                                }))}
                                placeholder="ID RT"
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="datetime-local"
                                value={(newRow as any).date ? new Date((newRow as any).date).toISOString().slice(0, 16) : ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], date: e.target.value }
                                }))}
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                value={(newRow as any).month || ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], month: parseInt(e.target.value) }
                                }))}
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                value={(newRow as any).age || ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], age: parseInt(e.target.value) }
                                }))}
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                value={(newRow as any).sistol || ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], sistol: parseFloat(e.target.value) }
                                }))}
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                value={(newRow as any).diastol || ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], diastol: parseFloat(e.target.value) }
                                }))}
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={(newRow as any).on_treatment || false}
                                  onChange={(e) => setNewRows(prev => ({
                                    ...prev,
                                    [newId]: { ...prev[newId], on_treatment: e.target.checked }
                                  }))}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={(newRow as any).diabetes_koin || false}
                                  onChange={(e) => setNewRows(prev => ({
                                    ...prev,
                                    [newId]: { ...prev[newId], diabetes_koin: e.target.checked }
                                  }))}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={(newRow as any).perokok || false}
                                  onChange={(e) => setNewRows(prev => ({
                                    ...prev,
                                    [newId]: { ...prev[newId], perokok: e.target.checked }
                                  }))}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                step="0.01"
                                value={(newRow as any).adherence_current || ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], adherence_current: parseFloat(e.target.value) }
                                }))}
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  onClick={() => saveNewRow(newId)}
                                  disabled={saving}
                                  className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => cancelNewRow(newId)}
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        
                        {/* Existing adults rows - Longitudinal Data with Enhanced Styling */}
                        {filteredAdultsGrouped.map(([personId, records]) => {
                          const latestRecord = records[0];
                          const isExpanded = expandedRows.has(personId);
                          const recordCount = records.length;
                          return (
                            <React.Fragment key={personId}>
                              {/* Main row showing latest record with correct alignment */}
                              <tr className="hover:bg-blue-50/50 border-l-4 border-blue-400">
                                {/* Expand/collapse button */}
                                <td className="px-4 py-3 text-sm font-medium text-blue-900">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => toggleRowExpansion(personId)}
                                    className="h-6 w-6 p-0 hover:bg-blue-100"
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-3 w-3" />
                                    ) : (
                                      <ChevronRight className="h-3 w-3" />
                                    )}
                                  </Button>
                                </td>
                                {/* ID Orang (person_id) */}
                                <td className="px-4 py-3 text-sm">{renderEditableCell(latestRecord.id?.toString() || '', 'person_id', latestRecord.person_id)}</td>
                                {/* ID Rumah Tangga */}
                                <td className="px-4 py-3 text-sm">{renderEditableCell(latestRecord.id?.toString() || '', 'household_id', latestRecord.household_id)}</td>
                                {/* Tanggal */}
                                <td className="px-4 py-3 text-sm">{renderEditableCell(latestRecord.id?.toString() || '', 'date', latestRecord.date, 'date')}</td>
                                {/* Bulan */}
                                <td className="px-4 py-3 text-sm">{renderEditableCell(latestRecord.id?.toString() || '', 'month', latestRecord.month, 'number')}</td>
                                {/* Usia */}
                                <td className="px-4 py-3 text-sm">{renderEditableCell(latestRecord.id?.toString() || '', 'age', latestRecord.age, 'number')}</td>
                                {/* Sistol */}
                                <td className="px-4 py-3 text-sm">{renderEditableCell(latestRecord.id?.toString() || '', 'sistol', latestRecord.sistol, 'number')}</td>
                                {/* Diastol */}
                                <td className="px-4 py-3 text-sm">{renderEditableCell(latestRecord.id?.toString() || '', 'diastol', latestRecord.diastol, 'number')}</td>
                                {/* Dalam Pengobatan */}
                                <td className="px-4 py-3 text-sm">{renderEditableCell(latestRecord.id?.toString() || '', 'on_treatment', latestRecord.on_treatment, 'boolean')}</td>
                                {/* Diabetes */}
                                <td className="px-4 py-3 text-sm">{renderEditableCell(latestRecord.id?.toString() || '', 'diabetes_koin', latestRecord.diabetes_koin, 'boolean')}</td>
                                {/* Perokok */}
                                <td className="px-4 py-3 text-sm">{renderEditableCell(latestRecord.id?.toString() || '', 'perokok', latestRecord.perokok, 'boolean')}</td>
                                {/* Kepatuhan */}
                                <td className="px-4 py-3 text-sm">{renderEditableCell(latestRecord.id?.toString() || '', 'adherence_current', latestRecord.adherence_current, 'number')}</td>
                                {/* Aksi */}
                                <td className="px-4 py-3">
                                  <div className="flex space-x-1">
                                    <Button
                                      size="sm"
                                      onClick={() => addTimeSeriesRecord(personId, 'adults')}
                                      className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
                                      title="Tambah rekaman baru"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => deleteRow(personId)}
                                      className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                                      title="Hapus semua rekaman"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                              {/* Expanded historical records with enhanced styling */}
                              {isExpanded && records.slice(1).map((record, index) => (
                                <tr key={`${personId}-${index + 1}`} className="bg-blue-50/30 border-l-4 border-blue-200">
                                  <td className="px-4 py-2 text-xs text-gray-500 pl-12">
                                    <span className="text-blue-600">Riwayat #{index + 1}</span>
                                  </td>
                                  <td className="px-4 py-2 text-xs">{record.person_id}</td>
                                  <td className="px-4 py-2 text-xs">{record.household_id}</td>
                                  <td className="px-4 py-2 text-xs">{new Date(record.date).toLocaleDateString('id-ID')}</td>
                                  <td className="px-4 py-2 text-xs">{record.month}</td>
                                  <td className="px-4 py-2 text-xs">{record.age}</td>
                                  <td className="px-4 py-2 text-xs">{record.sistol?.toFixed(1)}</td>
                                  <td className="px-4 py-2 text-xs">{record.diastol?.toFixed(1)}</td>
                                  <td className="px-4 py-2 text-xs">{record.on_treatment ? '✓' : '✗'}</td>
                                  <td className="px-4 py-2 text-xs">{record.diabetes_koin ? '✓' : '✗'}</td>
                                  <td className="px-4 py-2 text-xs">{record.perokok ? '✓' : '✗'}</td>
                                  <td className="px-4 py-2 text-xs">{record.adherence_current?.toFixed(2)}</td>
                                  <td className="px-4 py-2 text-xs text-gray-400">Riwayat</td>
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              {/* Children Table */}
              <TabsContent value="children" className="mt-6">
                <div className="border border-blue-200/50 rounded-xl overflow-hidden bg-white/90 backdrop-blur-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider w-8"></th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">ID Anak</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">ID Rumah Tangga</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Tanggal</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Bulan</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Usia (bulan)</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">HAZ</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Dalam Program</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Anemia (HB)</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Air Bersih</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Jamban Sehat</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Perubahan HAZ</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-100">
                        {/* New rows for children */}
                        {Object.entries(newRows).filter(() => activeTab === "children").map(([newId, newRow]) => (
                          <tr key={newId} className="hover:bg-blue-50/50 bg-green-50/30">
                            <td className="px-4 py-3">
                              <Input
                                value={newRow.child_id || ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], child_id: e.target.value }
                                }))}
                                placeholder="ID Anak"
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                value={newRow.household_id || ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], household_id: e.target.value }
                                }))}
                                placeholder="ID RT"
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="datetime-local"
                                value={newRow.date ? new Date(newRow.date).toISOString().slice(0, 16) : ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], date: e.target.value }
                                }))}
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                value={newRow.month || ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], month: parseInt(e.target.value) }
                                }))}
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                value={newRow.usia_bulan || ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], usia_bulan: parseInt(e.target.value) }
                                }))}
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                step="0.001"
                                value={newRow.HAZ || ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], HAZ: parseFloat(e.target.value) }
                                }))}
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={newRow.on_program || false}
                                  onChange={(e) => setNewRows(prev => ({
                                    ...prev,
                                    [newId]: { ...prev[newId], on_program: e.target.checked }
                                  }))}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                step="0.1"
                                value={newRow.anemia_hb_gdl || ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], anemia_hb_gdl: e.target.value ? parseFloat(e.target.value) : null }
                                }))}
                                className="h-8 text-xs"
                                placeholder="Optional"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={newRow.air_bersih || false}
                                  onChange={(e) => setNewRows(prev => ({
                                    ...prev,
                                    [newId]: { ...prev[newId], air_bersih: e.target.checked }
                                  }))}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={newRow.jamban_sehat || false}
                                  onChange={(e) => setNewRows(prev => ({
                                    ...prev,
                                    [newId]: { ...prev[newId], jamban_sehat: e.target.checked }
                                  }))}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                step="0.001"
                                value={newRow.haz_change_this_month || ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], haz_change_this_month: parseFloat(e.target.value) }
                                }))}
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  onClick={() => saveNewRow(newId)}
                                  disabled={saving}
                                  className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setNewRows(prev => {
                                    const newState = { ...prev };
                                    delete newState[newId];
                                    return newState;
                                  })}
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}

                        {/* Existing children rows - Longitudinal Data with Expand/Collapse */}
                        {filteredChildrenGrouped.map(([childId, records]) => {
                          const latestRecord = records[0];
                          const isExpanded = expandedChildren.has(childId);
                          const recordCount = records.length;
                          
                          return (
                            <React.Fragment key={childId}>
                              {/* Main row showing latest record */}
                              <tr className="hover:bg-blue-50/50 border-l-4 border-blue-400">
                                <td className="px-4 py-3 text-sm font-medium text-blue-900">
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleChildExpansion(childId)}
                                      className="h-6 w-6 p-0 hover:bg-blue-100"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-3 w-3" />
                                      ) : (
                                        <ChevronRight className="h-3 w-3" />
                                      )}
                                    </Button>
                                    <span>{childId}</span>
                                    <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">
                                      {recordCount} rekaman
                                    </Badge>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm">{renderEditableCell(childId, 'household_id', latestRecord.household_id)}</td>
                                <td className="px-4 py-3 text-sm">{renderEditableCell(childId, 'date', latestRecord.date, 'date')}</td>
                                <td className="px-4 py-3 text-sm">{renderEditableCell(childId, 'month', latestRecord.month, 'number')}</td>
                                <td className="px-4 py-3 text-sm">{renderEditableCell(childId, 'usia_bulan', latestRecord.usia_bulan, 'number')}</td>
                                <td className="px-4 py-3 text-sm">{renderEditableCell(childId, 'HAZ', latestRecord.HAZ, 'number')}</td>
                                <td className="px-4 py-3 text-sm">{renderEditableCell(childId, 'on_program', latestRecord.on_program, 'boolean')}</td>
                                <td className="px-4 py-3 text-sm">{renderEditableCell(childId, 'anemia_hb_gdl', latestRecord.anemia_hb_gdl, 'number')}</td>
                                <td className="px-4 py-3 text-sm">{renderEditableCell(childId, 'air_bersih', latestRecord.air_bersih, 'boolean')}</td>
                                <td className="px-4 py-3 text-sm">{renderEditableCell(childId, 'jamban_sehat', latestRecord.jamban_sehat, 'boolean')}</td>
                                <td className="px-4 py-3 text-sm">{renderEditableCell(childId, 'haz_change_this_month', latestRecord.haz_change_this_month, 'number')}</td>
                                <td className="px-4 py-3">
                                  <div className="flex space-x-1">
                                    <Button
                                      size="sm"
                                      onClick={() => addTimeSeriesRecord(childId, 'children')}
                                      className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
                                      title="Tambah rekaman baru"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => deleteRow(childId)}
                                      className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                                      title="Hapus semua rekaman"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                              
                              {/* Expanded historical records */}
                              {isExpanded && records.slice(1).map((record, index) => (
                                <tr key={`${childId}-${index + 1}`} className="bg-blue-50/30 border-l-4 border-blue-200">
                                  <td className="px-4 py-2 text-xs text-gray-500 pl-12">
                                    <span className="text-blue-600">Riwayat #{index + 1}</span>
                                  </td>
                                  <td className="px-4 py-2 text-xs">{record.household_id}</td>
                                  <td className="px-4 py-2 text-xs">{new Date(record.date).toLocaleDateString('id-ID')}</td>
                                  <td className="px-4 py-2 text-xs">{record.month}</td>
                                  <td className="px-4 py-2 text-xs">{record.usia_bulan}</td>
                                  <td className="px-4 py-2 text-xs">{record.HAZ?.toFixed(3)}</td>
                                  <td className="px-4 py-2 text-xs">{record.on_program ? '✓' : '✗'}</td>
                                  <td className="px-4 py-2 text-xs">{record.anemia_hb_gdl?.toFixed(1) || '-'}</td>
                                  <td className="px-4 py-2 text-xs">{record.air_bersih ? '✓' : '✗'}</td>
                                  <td className="px-4 py-2 text-xs">{record.jamban_sehat ? '✓' : '✗'}</td>
                                  <td className="px-4 py-2 text-xs">{record.haz_change_this_month?.toFixed(3)}</td>
                                  <td className="px-4 py-2 text-xs text-gray-400">Riwayat</td>
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              {/* Households Table */}
              <TabsContent value="households" className="mt-6">
                <div className="border border-blue-200/50 rounded-xl overflow-hidden bg-white/90 backdrop-blur-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200/50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">ID Rumah Tangga</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Pendapatan RT</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Kepemilikan Rumah</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Akses Listrik</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Akses Internet</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-100">
                        {/* New rows for households */}
                        {Object.entries(newRows).filter(() => activeTab === "households").map(([newId, newRow]) => (
                          <tr key={newId} className="hover:bg-blue-50/50 bg-green-50/30">
                            <td className="px-4 py-3">
                              <Input
                                value={newRow.household_id || ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], household_id: e.target.value }
                                }))}
                                placeholder="ID RT"
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <Input
                                type="number"
                                value={newRow.pendapatan_rt || ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], pendapatan_rt: parseFloat(e.target.value) }
                                }))}
                                placeholder="Pendapatan"
                                className="h-8 text-xs"
                              />
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={newRow.kepemilikan_rumah || false}
                                  onChange={(e) => setNewRows(prev => ({
                                    ...prev,
                                    [newId]: { ...prev[newId], kepemilikan_rumah: e.target.checked }
                                  }))}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={newRow.akses_listrik || false}
                                  onChange={(e) => setNewRows(prev => ({
                                    ...prev,
                                    [newId]: { ...prev[newId], akses_listrik: e.target.checked }
                                  }))}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex justify-center">
                                <Checkbox
                                  checked={newRow.akses_internet || false}
                                  onChange={(e) => setNewRows(prev => ({
                                    ...prev,
                                    [newId]: { ...prev[newId], akses_internet: e.target.checked }
                                  }))}
                                />
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  onClick={() => saveNewRow(newId)}
                                  disabled={saving}
                                  className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setNewRows(prev => {
                                    const newState = { ...prev };
                                    delete newState[newId];
                                    return newState;
                                  })}
                                  className="h-6 w-6 p-0"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}

                        {/* Existing household rows */}
                        {filteredHouseholds.map((household) => (
                          <tr key={household.household_id} className="hover:bg-blue-50/50">
                            <td className="px-4 py-3 text-sm font-medium">{household.household_id}</td>
                            <td className="px-4 py-3 text-sm">{renderEditableCell(household.household_id, 'pendapatan_rt', household.pendapatan_rt, 'number')}</td>
                            <td className="px-4 py-3 text-sm">{renderEditableCell(household.household_id, 'kepemilikan_rumah', household.kepemilikan_rumah, 'boolean')}</td>
                            <td className="px-4 py-3 text-sm">{renderEditableCell(household.household_id, 'akses_listrik', household.akses_listrik, 'boolean')}</td>
                            <td className="px-4 py-3 text-sm">{renderEditableCell(household.household_id, 'akses_internet', household.akses_internet, 'boolean')}</td>
                            <td className="px-4 py-3">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteRow(household.household_id)}
                                className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>

              {/* Programs Table */}
              <TabsContent value="programs" className="mt-6">
                <div className="border border-blue-200/50 rounded-xl overflow-hidden bg-white/90 backdrop-blur-sm">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-blue-200">
                      <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider w-8"></th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Target ID</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Program</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">ID Rumah Tangga</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Tanggal</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Biaya Riil</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Status</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Deskripsi</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-blue-800 uppercase tracking-wider">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-blue-100">
                        {/* New Program Row */}
                        {Object.entries(newRows).filter(() => activeTab === "programs").map(([newId, newRow]) => (
                          <tr key={newId} className="bg-green-50/50 border-l-4 border-green-400">
                            <td className="px-4 py-2 text-sm text-gray-500">
                              <div className="flex items-center justify-center">
                              </div>
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                placeholder="Target ID"
                                value={(newRow as any).target_id || ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], target_id: e.target.value }
                                }))}
                                className="border-blue-200 focus:border-blue-400"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                placeholder="Nama program"
                                value={(newRow as any).program || ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], program: e.target.value }
                                }))}
                                className="border-blue-200 focus:border-blue-400"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                placeholder="Household ID"
                                value={(newRow as any).household_id || ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], household_id: e.target.value }
                                }))}
                                className="border-blue-200 focus:border-blue-400"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                type="datetime-local"
                                value={(newRow as any).tanggal ? new Date((newRow as any).tanggal).toISOString().slice(0, 16) : ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], tanggal: e.target.value }
                                }))}
                                className="border-blue-200 focus:border-blue-400"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                type="number"
                                placeholder="Biaya riil"
                                value={(newRow as any).biaya_riil || ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], biaya_riil: parseFloat(e.target.value) || 0 }
                                }))}
                                className="border-blue-200 focus:border-blue-400"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                placeholder="Status"
                                value={(newRow as any).status || ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], status: e.target.value }
                                }))}
                                className="border-blue-200 focus:border-blue-400"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <Input
                                placeholder="Deskripsi"
                                value={(newRow as any).description || ''}
                                onChange={(e) => setNewRows(prev => ({
                                  ...prev,
                                  [newId]: { ...prev[newId], description: e.target.value }
                                }))}
                                className="border-blue-200 focus:border-blue-400"
                              />
                            </td>
                            <td className="px-4 py-2">
                              <div className="flex space-x-1">
                                <Button
                                  size="sm"
                                  onClick={() => saveNewRow(newId)}
                                  disabled={saving}
                                  className="h-6 px-2 text-xs bg-green-600 hover:bg-green-700"
                                >
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => cancelNewRow(newId)}
                                  className="h-6 px-2 text-xs"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}

                        {/* Existing Programs - Longitudinal Data with Enhanced Styling */}
                        {filteredProgramsGrouped.map(([targetId, records]) => {
                          const latestRecord = records[0];
                          const isExpanded = expandedPrograms.has(targetId);
                          const recordCount = records.length;
                          
                          return (
                            <React.Fragment key={targetId}>
                              {/* Main row showing latest record with enhanced styling */}
                              <tr className="hover:bg-blue-50/50 border-l-4 border-blue-400">
                                <td className="px-4 py-3">
                                  <div className="flex items-center space-x-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleProgramExpansion(targetId)}
                                      className="h-6 w-6 p-0 hover:bg-blue-100"
                                      title={isExpanded ? "Tutup riwayat" : "Lihat riwayat"}
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4 text-blue-600" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4 text-blue-600" />
                                      )}
                                    </Button>
                                    <Badge 
                                      variant="secondary" 
                                      className="bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 text-xs"
                                    >
                                      {recordCount} rekaman
                                    </Badge>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-sm font-medium text-blue-900">{targetId}</td>
                                <td className="px-4 py-3 text-sm">{renderEditableCell(latestRecord.id?.toString() || '', 'program', latestRecord.program, 'text')}</td>
                                <td className="px-4 py-3 text-sm">{renderEditableCell(latestRecord.id?.toString() || '', 'household_id', latestRecord.household_id, 'text')}</td>
                                <td className="px-4 py-3 text-sm">{renderEditableCell(latestRecord.id?.toString() || '', 'tanggal', latestRecord.tanggal, 'date')}</td>
                                <td className="px-4 py-3 text-sm">{renderEditableCell(latestRecord.id?.toString() || '', 'biaya_riil', latestRecord.biaya_riil, 'number')}</td>
                                <td className="px-4 py-3 text-sm">{renderEditableCell(latestRecord.id?.toString() || '', 'status', latestRecord.status, 'text')}</td>
                                <td className="px-4 py-3 text-sm">{renderEditableCell(latestRecord.id?.toString() || '', 'description', latestRecord.description, 'text')}</td>
                                <td className="px-4 py-3">
                                  <div className="flex space-x-1">
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => deleteRow(latestRecord.id?.toString() || '')}
                                      className="h-6 w-6 p-0 text-red-600 hover:bg-red-50"
                                      title="Hapus record"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                              
                              {/* Expanded historical records with enhanced styling */}
                              {isExpanded && records.slice(1).map((record, index) => (
                                <tr key={`${targetId}-${index + 1}`} className="bg-blue-50/30 border-l-4 border-blue-200">
                                  <td className="px-4 py-2">
                                    <div className="pl-12 flex items-center">
                                      <Calendar className="h-3 w-3 text-blue-400 mr-1" />
                                      <span className="text-xs text-blue-600">Riwayat {index + 1}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-2 text-xs pl-12 text-gray-600">{targetId}</td>
                                  <td className="px-4 py-2 text-xs">{record.program}</td>
                                  <td className="px-4 py-2 text-xs">{record.household_id}</td>
                                  <td className="px-4 py-2 text-xs">{new Date(record.tanggal).toLocaleDateString('id-ID')}</td>
                                  <td className="px-4 py-2 text-xs">{record.biaya_riil?.toLocaleString('id-ID')}</td>
                                  <td className="px-4 py-2 text-xs">{record.status}</td>
                                  <td className="px-4 py-2 text-xs">{record.description}</td>
                                  <td className="px-4 py-2">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => deleteRow(record.id?.toString() || '')}
                                      className="h-5 w-5 p-0 text-red-500 hover:bg-red-50"
                                      title="Hapus record ini"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Footer */}
            <div className="mt-6 text-center text-sm text-blue-600/70">
              <p>Klik pada sel untuk mengedit langsung • Gunakan Enter untuk menyimpan • Escape untuk membatalkan</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
