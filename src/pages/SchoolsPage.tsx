import React, { useState, useEffect } from "react";
import { schoolService, ApiError } from "../lib/api";
import { SchoolItem, UpdateSchoolRequest } from "../types/api";
import { useAuth } from "../context/AuthContext";
import { TANZANIA_REGIONS } from "../data/tanzaniaRegions";
import {
  School,
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Filter,
  RefreshCw,
  Building2,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export const SchoolsPage: React.FC = () => {
  const { role } = useAuth();
  const isAdmin = role?.toLowerCase() === "admin";

  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Edit Modal State
  const [editingSchool, setEditingSchool] = useState<SchoolItem | null>(null);
  const [editName, setEditName] = useState("");
  const [editRegion, setEditRegion] = useState("");
  const [editType, setEditType] = useState("");
  const [editHeadmaster, setEditHeadmaster] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Confirm Modal State
  const [deletingSchoolId, setDeletingSchoolId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Verification Action
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  const fetchSchools = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = {
        page,
        page_size: pageSize,
      };
      if (searchQuery.trim()) params.q = searchQuery.trim();
      if (selectedRegion.trim()) params.region = selectedRegion.trim();
      if (selectedStatus.trim()) params.verification_status = selectedStatus.trim();

      const res = await schoolService.listSchools(params);
      setSchools(res.schools || []);
      if (res.pagination) {
        setTotalCount(res.pagination.total);
      } else {
        setTotalCount((res.schools || []).length);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to load schools from the server.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSchools();
  }, [page, selectedRegion, selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSchools();
  };

  const handleOpenEdit = (school: SchoolItem) => {
    setEditingSchool(school);
    setEditName(school.name);
    setEditRegion(school.region);
    setEditType(school.school_type);
    setEditHeadmaster("");
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSchool) return;

    setIsUpdating(true);
    setEditError(null);
    try {
      const payload: UpdateSchoolRequest = {
        name: editName.trim(),
        region: editRegion.trim(),
        school_type: editType.trim(),
      };
      if (editHeadmaster.trim()) {
        payload.headmaster_name = editHeadmaster.trim();
      }

      await schoolService.updateSchool(editingSchool.id, payload);
      setEditingSchool(null);
      await fetchSchools();
    } catch (err: any) {
      setEditError(err?.message || "Failed to update school details.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingSchoolId) return;
    setIsDeleting(true);
    try {
      await schoolService.deleteSchool(deletingSchoolId);
      setDeletingSchoolId(null);
      await fetchSchools();
    } catch (err: any) {
      alert(err?.message || "Failed to delete school.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleVerify = async (schoolId: string) => {
    setVerifyingId(schoolId);
    try {
      await schoolService.verifySchool(schoolId, "verified");
      await fetchSchools();
    } catch (err: any) {
      alert(err?.message || "Failed to verify school.");
    } finally {
      setVerifyingId(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6 text-left animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-[#D69B67]" />
            <span className="text-[11px] font-mono tracking-widest text-[#D69B67] uppercase font-bold">
              INSTITUTIONAL DIRECTORY
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#15223F]">Schools Directory</h2>
          <p className="text-xs text-gray-500 mt-1">
            Browse registered Tanzanian primary and secondary institutions, accreditation statuses, and regions.
          </p>
        </div>

        <button
          onClick={fetchSchools}
          className="px-4 py-2 bg-[#FAF6EE] hover:bg-amber-100/50 text-[#15223F] rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer w-fit border border-[#15223F]/10"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search & Filters */}
      <form onSubmit={handleSearchSubmit} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Fuzzy search schools by name..."
              className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 focus:border-[#D69B67] focus:outline-none"
            />
          </div>

          <div className="sm:col-span-3">
            <select
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:border-[#D69B67] focus:outline-none font-medium"
            >
              <option value="">All Regions</option>
              {TANZANIA_REGIONS.map((r) => (
                <option key={r.name} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                setPage(1);
              }}
              className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-slate-800 focus:border-[#D69B67] focus:outline-none font-medium"
            >
              <option value="">All Statuses</option>
              <option value="verified">Verified</option>
              <option value="pending">Pending</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          <div className="sm:col-span-1">
            <button
              type="submit"
              className="w-full h-full py-2.5 bg-[#15223F] hover:bg-[#0E1729] text-[#D69B67] font-bold text-xs rounded-xl flex items-center justify-center cursor-pointer transition-all"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <div className="flex-1">
            <p className="font-bold">{error}</p>
          </div>
          <button
            onClick={fetchSchools}
            className="px-3 py-1 bg-rose-700 text-white font-bold rounded-lg hover:bg-rose-800 text-[11px]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-16 text-center space-y-3 border border-gray-100 shadow-xs">
          <Loader2 className="w-8 h-8 animate-spin text-[#D69B67] mx-auto" />
          <p className="text-xs text-gray-400 font-mono">Fetching schools from backend API...</p>
        </div>
      ) : schools.length === 0 ? (
        /* Empty state */
        <div className="bg-white rounded-3xl p-16 text-center space-y-3 border border-gray-100 shadow-xs">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-700">No schools found</h3>
          <p className="text-xs text-gray-400 max-w-sm mx-auto">
            {searchQuery || selectedRegion || selectedStatus
              ? "No schools matched your search filters. Try clearing or expanding your query."
              : "No schools are currently registered on the server."}
          </p>
          {(searchQuery || selectedRegion || selectedStatus) && (
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedRegion("");
                setSelectedStatus("");
                setPage(1);
              }}
              className="text-xs text-[#D69B67] font-bold hover:underline"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        /* Table of Schools */
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF6EE] text-slate-700 uppercase font-mono text-[10px] tracking-wider border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">School Name</th>
                  <th className="py-3 px-4">Reg No</th>
                  <th className="py-3 px-4">Region</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {schools.map((school) => {
                  const isVerified = (school.verification_status || "").toLowerCase() === "verified";
                  return (
                    <tr key={school.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800">{school.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono">UUID: {school.id}</div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-[#15223F]">
                        {school.registration_number}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">{school.region}</td>
                      <td className="py-3.5 px-4 text-slate-600">{school.school_type}</td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                            isVerified
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {isVerified ? (
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                          )}
                          {school.verification_status || "Pending"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                        {/* Verify Button (Admin Only) */}
                        {isAdmin && !isVerified && (
                          <button
                            onClick={() => handleVerify(school.id)}
                            disabled={verifyingId === school.id}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold cursor-pointer transition-all inline-flex items-center gap-1"
                            title="Verify School Accreditation"
                          >
                            {verifyingId === school.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <ShieldCheck className="w-3 h-3" />
                            )}
                            <span>Verify</span>
                          </button>
                        )}

                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEdit(school)}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 rounded-lg cursor-pointer transition-all inline-block"
                          title="Edit School Details"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => setDeletingSchoolId(school.id)}
                          className="p-1.5 hover:bg-rose-50 text-rose-600 rounded-lg cursor-pointer transition-all inline-block"
                          title="Delete School Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-mono">
            <span>
              Showing {schools.length} of {totalCount} schools (Page {page})
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={schools.length < pageSize}
                className="p-1.5 rounded-lg border border-gray-200 hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit School Modal */}
      {editingSchool && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 animate-scale-up text-left">
            <h3 className="text-lg font-serif font-bold text-[#15223F]">Edit School Record</h3>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 font-mono">School Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 font-mono">Region</label>
                <select
                  value={editRegion}
                  onChange={(e) => setEditRegion(e.target.value)}
                  className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                >
                  {TANZANIA_REGIONS.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 font-mono">School Type</label>
                <select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                  className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                >
                  <option value="Secondary">Secondary</option>
                  <option value="High School">High School</option>
                  <option value="Combined">Combined</option>
                  <option value="Primary">Primary</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 font-mono">Headmaster Name (Optional)</label>
                <input
                  type="text"
                  value={editHeadmaster}
                  onChange={(e) => setEditHeadmaster(e.target.value)}
                  placeholder="e.g. Mwl. Juma Kassim"
                  className="w-full bg-[#FAF6EE] border border-gray-200 rounded-xl px-3 py-2 text-xs text-slate-800"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingSchool(null)}
                  className="px-4 py-2 border border-gray-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 bg-[#15223F] hover:bg-[#0E1729] text-[#D69B67] rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isUpdating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingSchoolId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl space-y-4 animate-scale-up text-left">
            <h3 className="text-base font-bold text-slate-900">Confirm Deletion</h3>
            <p className="text-xs text-gray-500">
              Are you sure you want to permanently delete school <span className="font-mono font-bold text-rose-600">{deletingSchoolId}</span>? This action sends a DELETE request and cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingSchoolId(null)}
                className="px-4 py-2 border border-gray-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete School</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
