"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Users,
  Baby,
  Home,
  Calendar,
  RefreshCw,
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
  ProgramCreate
} from "@/types/crud-models";

interface CRUDManagementProps {
  initialTab?: "adults" | "children" | "households" | "programs";
}

export default function CRUDManagement({ initialTab = "adults" }: CRUDManagementProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State untuk time-based grouping
  const [groupByPerson, setGroupByPerson] = useState(false);
  const [groupByChild, setGroupByChild] = useState(false);

  // State untuk time series viewing
  const [timeSeriesData, setTimeSeriesData] = useState<AdultRecord[] | ChildRecord[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [showTimeSeries, setShowTimeSeries] = useState(false);

  // State untuk Adults
  const [adults, setAdults] = useState<AdultRecord[]>([]);
  const [selectedAdult, setSelectedAdult] = useState<AdultRecord | null>(null);
  const [adultFormData, setAdultFormData] = useState<AdultCreate>({
    person_id: "",
    household_id: "",
    date: "",
    month: 1,
    age: 0,
    sistol: 0,
    diastol: 0,
    on_treatment: false,
    diabetes_koin: false,
    perokok: false,
    keturunan_hipertensi: false,
    aktivitas_fisik_rendah: false
  });

  // State untuk Children
  const [children, setChildren] = useState<ChildRecord[]>([]);
  const [selectedChild, setSelectedChild] = useState<ChildRecord | null>(null);
  const [childFormData, setChildFormData] = useState<ChildCreate>({
    child_id: "",
    household_id: "",
    date: "",
    month: 1,
    usia_bulan: 0,
    HAZ: 0,
    on_program: false,
    anemia_hb_gdl: 0,
    air_bersih: false,
    jamban_sehat: false,
    haz_change_this_month: 0
  });

  // State untuk Households
  const [households, setHouseholds] = useState<HouseholdRecord[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState<HouseholdRecord | null>(null);
  const [householdFormData, setHouseholdFormData] = useState<HouseholdCreate>({
    household_id: "",
    dusun: "",
    rt: "",
    rw: "",
    village: "",
    subdistrict: ""
  });

  // State untuk Programs
  const [programs, setPrograms] = useState<ProgramRecord[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<ProgramRecord | null>(null);
  const [programFormData, setProgramFormData] = useState<ProgramCreate>({
    program: "",
    target_id: "",
    household_id: "",
    tanggal: "",
    biaya_riil: 0,
    status: "active",
    description: ""
  });

  // Dialog states
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "edit">("create");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const pageSize = 20;

  // Load data ketika tab berubah
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let result;
      
      switch (activeTab) {
        case "adults":
          result = searchQuery ? 
            await adultsService.search(searchQuery, currentPage, pageSize) :
            await adultsService.getAll(currentPage, pageSize, groupByPerson);
          setAdults(result.items);
          break;
          
        case "children":
          result = searchQuery ? 
            await childrenService.search(searchQuery, currentPage, pageSize) :
            await childrenService.getAll(currentPage, pageSize, groupByChild);
          setChildren(result.items);
          break;
          
        case "households":
          result = searchQuery ? 
            await householdsService.search(searchQuery, currentPage, pageSize) :
            await householdsService.getAll(currentPage, pageSize);
          setHouseholds(result.items);
          break;
          
        case "programs":
          result = searchQuery ? 
            await programsService.search(searchQuery, currentPage, pageSize) :
            await programsService.getAll(currentPage, pageSize);
          setPrograms(result.items);
          break;
      }
      
      setTotalPages(result.pages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [activeTab, currentPage, searchQuery, groupByPerson, groupByChild]);

  useEffect(() => {
    loadData();
  }, [activeTab, currentPage, searchQuery, groupByPerson, groupByChild, loadData]);

  // Handler untuk membuka dialog
  const openCreateDialog = () => {
    setDialogMode("create");
    resetFormData();
    setIsDialogOpen(true);
  };

  const openEditDialog = (item: AdultRecord | ChildRecord | HouseholdRecord | ProgramRecord) => {
    setDialogMode("edit");
    
    switch (activeTab) {
      case "adults":
        const adultItem = item as AdultRecord;
        setSelectedAdult(adultItem);
        setAdultFormData({
          person_id: adultItem.person_id,
          household_id: adultItem.household_id,
          date: adultItem.date,
          month: adultItem.month,
          age: adultItem.age,
          sistol: adultItem.sistol,
          diastol: adultItem.diastol,
          on_treatment: adultItem.on_treatment,
          diabetes_koin: adultItem.diabetes_koin,
          perokok: adultItem.perokok,
          keturunan_hipertensi: adultItem.keturunan_hipertensi,
          aktivitas_fisik_rendah: adultItem.aktivitas_fisik_rendah
        });
        break;
      case "children":
        const childItem = item as ChildRecord;
        setSelectedChild(childItem);
        setChildFormData({
          child_id: childItem.child_id,
          household_id: childItem.household_id,
          date: childItem.date,
          month: childItem.month,
          usia_bulan: childItem.usia_bulan,
          HAZ: childItem.HAZ,
          on_program: childItem.on_program,
          anemia_hb_gdl: childItem.anemia_hb_gdl,
          air_bersih: childItem.air_bersih,
          jamban_sehat: childItem.jamban_sehat,
          haz_change_this_month: childItem.haz_change_this_month
        });
        break;
      case "households":
        const householdItem = item as HouseholdRecord;
        setSelectedHousehold(householdItem);
        setHouseholdFormData({
          household_id: householdItem.household_id,
          dusun: householdItem.dusun,
          rt: householdItem.rt,
          rw: householdItem.rw,
          village: householdItem.village,
          subdistrict: householdItem.subdistrict
        });
        break;
      case "programs":
        const programItem = item as ProgramRecord;
        setSelectedProgram(programItem);
        setProgramFormData({
          program: programItem.program,
          target_id: programItem.target_id,
          household_id: programItem.household_id,
          tanggal: programItem.tanggal,
          biaya_riil: programItem.biaya_riil,
          status: programItem.status,
          description: programItem.description
        });
        break;
    }
    
    setIsDialogOpen(true);
  };

  // Reset form data
  const resetFormData = () => {
    setAdultFormData({
      person_id: "",
      household_id: "",
      date: "",
      month: 1,
      age: 0,
      sistol: 0,
      diastol: 0,
      on_treatment: false,
      diabetes_koin: false,
      perokok: false,
      keturunan_hipertensi: false,
      aktivitas_fisik_rendah: false
    });
    
    setChildFormData({
      child_id: "",
      household_id: "",
      date: "",
      month: 1,
      usia_bulan: 0,
      HAZ: 0,
      on_program: false,
      anemia_hb_gdl: 0,
      air_bersih: false,
      jamban_sehat: false,
      haz_change_this_month: 0
    });
    
    setHouseholdFormData({
      household_id: "",
      dusun: "",
      rt: "",
      rw: "",
      village: "",
      subdistrict: ""
    });
    
    setProgramFormData({
      program: "",
      target_id: "",
      household_id: "",
      tanggal: "",
      biaya_riil: 0,
      status: "active",
      description: ""
    });
  };

  // Handle submit form
  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      if (dialogMode === "create") {
        switch (activeTab) {
          case "adults":
            await adultsService.create(adultFormData);
            break;
          case "children":
            await childrenService.create(childFormData);
            break;
          case "households":
            await householdsService.create(householdFormData);
            break;
          case "programs":
            await programsService.create(programFormData);
            break;
        }
      } else {
        switch (activeTab) {
          case "adults":
            if (selectedAdult?.id) {
              await adultsService.update(selectedAdult.id, adultFormData);
            }
            break;
          case "children":
            if (selectedChild?.id) {
              await childrenService.update(selectedChild.id, childFormData);
            }
            break;
          case "households":
            if (selectedHousehold?.id) {
              await householdsService.update(selectedHousehold.id, householdFormData);
            }
            break;
          case "programs":
            if (selectedProgram?.id) {
              await programsService.update(selectedProgram.id, programFormData);
            }
            break;
        }
      }
      
      setIsDialogOpen(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan data");
    } finally {
      setLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: string | number) => {
    if (!confirm("Apakah Anda yakin ingin menghapus data ini?")) return;
    
    setLoading(true);
    try {
      switch (activeTab) {
        case "adults":
          await adultsService.delete(id);
          break;
        case "children":
          await childrenService.delete(id);
          break;
        case "households":
          await householdsService.delete(id);
          break;
        case "programs":
          await programsService.delete(id);
          break;
      }
      
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus data");
    } finally {
      setLoading(false);
    }
  };

  // Handle time series viewing for adults
  const handleViewAdultTimeSeries = async (personId: string) => {
    try {
      setLoading(true);
      const timeSeries = await adultsService.getTimeSeriesByPerson(personId);
      setTimeSeriesData(timeSeries);
      setSelectedPersonId(personId);
      setShowTimeSeries(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat riwayat data");
    } finally {
      setLoading(false);
    }
  };

  // Handle time series viewing for children
  const handleViewChildTimeSeries = async (childId: string) => {
    try {
      setLoading(true);
      const timeSeries = await childrenService.getTimeSeriesByChild(childId);
      setTimeSeriesData(timeSeries);
      setSelectedChildId(childId);
      setShowTimeSeries(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat riwayat data");
    } finally {
      setLoading(false);
    }
  };

  // Render Adults Table
  const renderAdultsTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID Orang</TableHead>
          <TableHead>ID Rumah Tangga</TableHead>
          <TableHead>Umur</TableHead>
          <TableHead>Sistol</TableHead>
          <TableHead>Diastol</TableHead>
          <TableHead>Sedang Dirawat</TableHead>
          <TableHead>Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {adults?.map((adult) => (
          <TableRow key={adult.id}>
            <TableCell className="font-medium">{adult.person_id}</TableCell>
            <TableCell>{adult.household_id}</TableCell>
            <TableCell>{adult.age ? `${adult.age} tahun` : 'Tidak tersedia'}</TableCell>
            <TableCell>{adult.sistol || 'Tidak tersedia'}</TableCell>
            <TableCell>{adult.diastol || 'Tidak tersedia'}</TableCell>
            <TableCell>
              <Badge variant={adult.on_treatment ? "default" : "secondary"}>
                {adult.on_treatment ? "Ya" : "Tidak"}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleViewAdultTimeSeries(adult.person_id)}
                  title="Lihat Riwayat"
                >
                  <Calendar className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => openEditDialog(adult)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => adult.id && handleDelete(adult.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {(!adults || adults.length === 0) && (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
              Tidak ada data dewasa yang ditemukan
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  // Render form for Adults
  const renderAdultForm = () => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="person_id">ID Orang</Label>
          <Input
            id="person_id"
            value={adultFormData.person_id}
            onChange={(e) => setAdultFormData({...adultFormData, person_id: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="household_id">ID Rumah Tangga</Label>
          <Input
            id="household_id"
            value={adultFormData.household_id}
            onChange={(e) => setAdultFormData({...adultFormData, household_id: e.target.value})}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="date">Tanggal</Label>
          <Input
            id="date"
            type="date"
            value={adultFormData.date}
            onChange={(e) => setAdultFormData({...adultFormData, date: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="age">Umur</Label>
          <Input
            id="age"
            type="number"
            value={adultFormData.age}
            onChange={(e) => setAdultFormData({...adultFormData, age: parseInt(e.target.value) || 0})}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="sistol">Sistol</Label>
          <Input
            id="sistol"
            type="number"
            value={adultFormData.sistol}
            onChange={(e) => setAdultFormData({...adultFormData, sistol: parseInt(e.target.value) || 0})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="diastol">Diastol</Label>
          <Input
            id="diastol"
            type="number"
            value={adultFormData.diastol}
            onChange={(e) => setAdultFormData({...adultFormData, diastol: parseInt(e.target.value) || 0})}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="on_treatment"
            checked={adultFormData.on_treatment}
            onChange={(e) => setAdultFormData({...adultFormData, on_treatment: e.target.checked})}
          />
          <Label htmlFor="on_treatment">Sedang Dirawat</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="diabetes_koin"
            checked={adultFormData.diabetes_koin}
            onChange={(e) => setAdultFormData({...adultFormData, diabetes_koin: e.target.checked})}
          />
          <Label htmlFor="diabetes_koin">Diabetes</Label>
        </div>
      </div>
    </div>
  );

  // Render Children Table
  const renderChildrenTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID Anak</TableHead>
          <TableHead>ID Rumah Tangga</TableHead>
          <TableHead>Umur (Bulan)</TableHead>
          <TableHead>HAZ Score</TableHead>
          <TableHead>Hemoglobin</TableHead>
          <TableHead>Program</TableHead>
          <TableHead>Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {children?.map((child) => (
          <TableRow key={child.id}>
            <TableCell className="font-medium">{child.child_id}</TableCell>
            <TableCell>{child.household_id}</TableCell>
            <TableCell>{child.usia_bulan ? `${child.usia_bulan} bulan` : 'Tidak tersedia'}</TableCell>
            <TableCell>{child.HAZ ? child.HAZ.toFixed(2) : 'Tidak tersedia'}</TableCell>
            <TableCell>{child.anemia_hb_gdl ? `${child.anemia_hb_gdl} g/dL` : 'Tidak tersedia'}</TableCell>
            <TableCell>
              <Badge variant={child.on_program ? "default" : "secondary"}>
                {child.on_program ? "Ya" : "Tidak"}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleViewChildTimeSeries(child.child_id)}
                  title="Lihat Riwayat"
                >
                  <Calendar className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => openEditDialog(child)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => child.id && handleDelete(child.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {(!children || children.length === 0) && (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-gray-500">
              Tidak ada data anak yang ditemukan
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  // Render Households Table
  const renderHouseholdsTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>ID Rumah Tangga</TableHead>
          <TableHead>Dusun</TableHead>
          <TableHead>RT/RW</TableHead>
          <TableHead>Desa</TableHead>
          <TableHead>Kecamatan</TableHead>
          <TableHead>Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {households?.map((household) => (
          <TableRow key={household.id}>
            <TableCell className="font-medium">{household.household_id}</TableCell>
            <TableCell>{household.dusun || 'Tidak tersedia'}</TableCell>
            <TableCell>
              {household.rt && household.rw 
                ? `${household.rt}/${household.rw}` 
                : 'Tidak tersedia'
              }
            </TableCell>
            <TableCell>{household.village || 'Tidak tersedia'}</TableCell>
            <TableCell>{household.subdistrict || 'Tidak tersedia'}</TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => openEditDialog(household)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => household.id && handleDelete(household.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {(!households || households.length === 0) && (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
              Tidak ada data rumah tangga yang ditemukan
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  // Render Programs Table
  const renderProgramsTable = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Target ID</TableHead>
          <TableHead>Jenis Program</TableHead>
          <TableHead>Tanggal</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Biaya</TableHead>
          <TableHead>Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {programs?.map((program) => (
          <TableRow key={program.id}>
            <TableCell className="font-medium">{program.target_id}</TableCell>
            <TableCell>{program.program}</TableCell>
            <TableCell>
              {program.tanggal 
                ? new Date(program.tanggal).toLocaleDateString('id-ID')
                : 'Tidak tersedia'
              }
            </TableCell>
            <TableCell>
              <Badge variant={program.status === 'active' ? "default" : "secondary"}>
                {program.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
              </Badge>
            </TableCell>
            <TableCell>
              {program.biaya_riil !== undefined && program.biaya_riil !== null 
                ? `Rp ${program.biaya_riil.toLocaleString('id-ID')}` 
                : 'Tidak tersedia'
              }
            </TableCell>
            <TableCell>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => openEditDialog(program)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => program.id && handleDelete(program.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
        {(!programs || programs.length === 0) && (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-8 text-gray-500">
              Tidak ada data program yang ditemukan
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  // Render form for Children
  const renderChildForm = () => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="child_id">ID Anak</Label>
          <Input
            id="child_id"
            value={childFormData.child_id}
            onChange={(e) => setChildFormData({...childFormData, child_id: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="child_household_id">ID Rumah Tangga</Label>
          <Input
            id="child_household_id"
            value={childFormData.household_id}
            onChange={(e) => setChildFormData({...childFormData, household_id: e.target.value})}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="child_date">Tanggal</Label>
          <Input
            id="child_date"
            type="date"
            value={childFormData.date}
            onChange={(e) => setChildFormData({...childFormData, date: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="usia_bulan">Umur (Bulan)</Label>
          <Input
            id="usia_bulan"
            type="number"
            value={childFormData.usia_bulan}
            onChange={(e) => setChildFormData({...childFormData, usia_bulan: parseInt(e.target.value) || 0})}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="haz_score">HAZ Score</Label>
          <Input
            id="haz_score"
            type="number"
            step="0.01"
            value={childFormData.HAZ}
            onChange={(e) => setChildFormData({...childFormData, HAZ: parseFloat(e.target.value) || 0})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="anemia_hb">Hemoglobin (g/dL)</Label>
          <Input
            id="anemia_hb"
            type="number"
            step="0.1"
            value={childFormData.anemia_hb_gdl}
            onChange={(e) => setChildFormData({...childFormData, anemia_hb_gdl: parseFloat(e.target.value) || 0})}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="on_program"
            checked={childFormData.on_program}
            onChange={(e) => setChildFormData({...childFormData, on_program: e.target.checked})}
          />
          <Label htmlFor="on_program">Dalam Program</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="air_bersih"
            checked={childFormData.air_bersih}
            onChange={(e) => setChildFormData({...childFormData, air_bersih: e.target.checked})}
          />
          <Label htmlFor="air_bersih">Air Bersih</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="jamban_sehat"
            checked={childFormData.jamban_sehat}
            onChange={(e) => setChildFormData({...childFormData, jamban_sehat: e.target.checked})}
          />
          <Label htmlFor="jamban_sehat">Jamban Sehat</Label>
        </div>
      </div>
    </div>
  );

  // Render form for Households
  const renderHouseholdForm = () => (
    <div className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="household_id_input">ID Rumah Tangga</Label>
        <Input
          id="household_id_input"
          value={householdFormData.household_id}
          onChange={(e) => setHouseholdFormData({...householdFormData, household_id: e.target.value})}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dusun">Dusun</Label>
          <Input
            id="dusun"
            value={householdFormData.dusun}
            onChange={(e) => setHouseholdFormData({...householdFormData, dusun: e.target.value})}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor="rt">RT</Label>
            <Input
              id="rt"
              value={householdFormData.rt}
              onChange={(e) => setHouseholdFormData({...householdFormData, rt: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rw">RW</Label>
            <Input
              id="rw"
              value={householdFormData.rw}
              onChange={(e) => setHouseholdFormData({...householdFormData, rw: e.target.value})}
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="village">Desa</Label>
          <Input
            id="village"
            value={householdFormData.village}
            onChange={(e) => setHouseholdFormData({...householdFormData, village: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="subdistrict">Kecamatan</Label>
          <Input
            id="subdistrict"
            value={householdFormData.subdistrict}
            onChange={(e) => setHouseholdFormData({...householdFormData, subdistrict: e.target.value})}
          />
        </div>
      </div>
    </div>
  );

  // Render form for Programs
  const renderProgramForm = () => (
    <div className="grid gap-4 py-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="target_id">Target ID</Label>
          <Input
            id="target_id"
            value={programFormData.target_id}
            onChange={(e) => setProgramFormData({...programFormData, target_id: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="program_household_id">ID Rumah Tangga</Label>
          <Input
            id="program_household_id"
            value={programFormData.household_id}
            onChange={(e) => setProgramFormData({...programFormData, household_id: e.target.value})}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="program_name">Jenis Program</Label>
          <Input
            id="program_name"
            value={programFormData.program}
            onChange={(e) => setProgramFormData({...programFormData, program: e.target.value})}
            placeholder="contoh: obat_htn, transport_htn, kontrol_htn"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="program_status">Status</Label>
          <select 
            id="program_status"
            value={programFormData.status}
            onChange={(e) => setProgramFormData({...programFormData, status: e.target.value})}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="active">Aktif</option>
            <option value="inactive">Tidak Aktif</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tanggal">Tanggal</Label>
          <Input
            id="tanggal"
            type="date"
            value={programFormData.tanggal}
            onChange={(e) => setProgramFormData({...programFormData, tanggal: e.target.value})}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="biaya_riil">Biaya Riil</Label>
          <Input
            id="biaya_riil"
            type="number"
            step="0.01"
            value={programFormData.biaya_riil}
            onChange={(e) => setProgramFormData({...programFormData, biaya_riil: parseFloat(e.target.value) || 0})}
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Deskripsi</Label>
        <Input
          id="description"
          value={programFormData.description}
          onChange={(e) => setProgramFormData({...programFormData, description: e.target.value})}
          placeholder="Deskripsi program (opsional)"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Manajemen Data Kesehatan
          </h1>
          <p className="text-gray-600">
            Kelola data dewasa, anak, rumah tangga, dan program kesehatan
          </p>
        </div>

        {/* Search and Actions */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Cari data..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              {/* Time-based Grouping Controls */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {(activeTab === "adults" || activeTab === "children") && (
                  <div className="flex items-center space-x-4 text-sm">
                    {activeTab === "adults" && (
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="group-person"
                          checked={groupByPerson}
                          onChange={(e) => setGroupByPerson(e.target.checked)}
                        />
                        <Label htmlFor="group-person" className="text-sm font-medium">
                          Group by Person (Latest Record)
                        </Label>
                      </div>
                    )}
                    {activeTab === "children" && (
                      <div className="flex items-center space-x-2">
                        <Checkbox 
                          id="group-child"
                          checked={groupByChild}
                          onChange={(e) => setGroupByChild(e.target.checked)}
                        />
                        <Label htmlFor="group-child" className="text-sm font-medium">
                          Group by Child (Latest Record)
                        </Label>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={loadData}
                    disabled={loading}
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    Muat Ulang
                  </Button>
                  
                  <Button onClick={openCreateDialog}>
                    <Plus className="w-4 h-4 mr-2" />
                    Tambah Data
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Data Kesehatan Digital Twin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "adults" | "children" | "households" | "programs")}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="adults" className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Data Dewasa
                </TabsTrigger>
                <TabsTrigger value="children" className="flex items-center gap-2">
                  <Baby className="w-4 h-4" />
                  Data Anak
                </TabsTrigger>
                <TabsTrigger value="households" className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Rumah Tangga
                </TabsTrigger>
                <TabsTrigger value="programs" className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Program
                </TabsTrigger>
              </TabsList>

              <TabsContent value="adults" className="mt-6">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : (
                  renderAdultsTable()
                )}
              </TabsContent>

              <TabsContent value="children" className="mt-6">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : (
                  renderChildrenTable()
                )}
              </TabsContent>

              <TabsContent value="households" className="mt-6">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : (
                  renderHouseholdsTable()
                )}
              </TabsContent>

              <TabsContent value="programs" className="mt-6">
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
                  </div>
                ) : (
                  renderProgramsTable()
                )}
              </TabsContent>
            </Tabs>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                >
                  Sebelumnya
                </Button>
                
                <span className="flex items-center px-4 text-sm text-gray-600">
                  Halaman {currentPage} dari {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                >
                  Selanjutnya
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        {isDialogOpen && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {dialogMode === "create" ? "Tambah Data" : "Edit Data"} {
                    activeTab === "adults" ? "Dewasa" :
                    activeTab === "children" ? "Anak" :
                    activeTab === "households" ? "Rumah Tangga" :
                    activeTab === "programs" ? "Program" : ""
                  }
                </DialogTitle>
                <DialogDescription>
                  {dialogMode === "create" ? "Masukkan" : "Ubah"} informasi data kesehatan.
                </DialogDescription>
              </DialogHeader>
              
              {activeTab === "adults" && renderAdultForm()}
              {activeTab === "children" && renderChildForm()}
              {activeTab === "households" && renderHouseholdForm()}
              {activeTab === "programs" && renderProgramForm()}
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Batal
                </Button>
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? "Menyimpan..." : "Simpan"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Time Series Modal */}
        {showTimeSeries && (
          <Dialog open={showTimeSeries} onOpenChange={setShowTimeSeries}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  Riwayat Data {selectedPersonId ? `Person: ${selectedPersonId}` : `Child: ${selectedChildId}`}
                </DialogTitle>
                <DialogDescription>
                  Data longitudinal berdasarkan waktu untuk individu yang dipilih.
                </DialogDescription>
              </DialogHeader>
              
              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tanggal</TableHead>
                      <TableHead>Bulan</TableHead>
                      {selectedPersonId && (
                        <>
                          <TableHead>Umur</TableHead>
                          <TableHead>Sistol</TableHead>
                          <TableHead>Diastol</TableHead>
                          <TableHead>Perawatan</TableHead>
                        </>
                      )}
                      {selectedChildId && (
                        <>
                          <TableHead>Umur (Bulan)</TableHead>
                          <TableHead>HAZ Score</TableHead>
                          <TableHead>Hemoglobin</TableHead>
                          <TableHead>Program</TableHead>
                        </>
                      )}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {timeSeriesData.map((record, index) => (
                      <TableRow key={index}>
                        <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                        <TableCell>{record.month}</TableCell>
                        {selectedPersonId && 'age' in record && (
                          <>
                            <TableCell>{record.age} tahun</TableCell>
                            <TableCell>{record.sistol}</TableCell>
                            <TableCell>{record.diastol}</TableCell>
                            <TableCell>
                              <Badge variant={record.on_treatment ? "default" : "secondary"}>
                                {record.on_treatment ? "Ya" : "Tidak"}
                              </Badge>
                            </TableCell>
                          </>
                        )}
                        {selectedChildId && 'usia_bulan' in record && (
                          <>
                            <TableCell>{record.usia_bulan} bulan</TableCell>
                            <TableCell>{record.HAZ?.toFixed(2)}</TableCell>
                            <TableCell>{record.anemia_hb_gdl} g/dL</TableCell>
                            <TableCell>
                              <Badge variant={record.on_program ? "default" : "secondary"}>
                                {record.on_program ? "Ya" : "Tidak"}
                              </Badge>
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowTimeSeries(false)}>
                  Tutup
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}
