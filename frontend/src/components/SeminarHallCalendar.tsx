import React, { useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  Building,
  Lock
} from 'lucide-react';
import { CalendarBooking } from '../types';

interface SeminarHallCalendarProps {
  bookings: CalendarBooking[];
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
  hallName?: string;
  isPrincipal?: boolean;
}

export const SeminarHallCalendar: React.FC<SeminarHallCalendarProps> = ({
  bookings,
  selectedDate,
  onSelectDate,
  hallName
}) => {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState<number>(
    selectedDate ? new Date(selectedDate).getMonth() : today.getMonth()
  );
  const [currentYear, setCurrentYear] = useState<number>(
    selectedDate ? new Date(selectedDate).getFullYear() : today.getFullYear()
  );

  const prevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(y => y - 1);
    } else {
      setCurrentMonth(m => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(y => y + 1);
    } else {
      setCurrentMonth(m => m + 1);
    }
  };

  const jumpToToday = () => {
    const now = new Date();
    setCurrentMonth(now.getMonth());
    setCurrentYear(now.getFullYear());
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    onSelectDate(`${yyyy}-${mm}-${dd}`);
  };

  // Calendar days computation
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sunday

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Helper to normalize any date input (string, Date, ISO) to 'YYYY-MM-DD'
  const normalizeDateKey = (val?: string | null): string => {
    if (!val) return '';
    return String(val).substring(0, 10);
  };

  // Helper to format date string
  const formatDateKey = (day: number): string => {
    const m = String(currentMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    return `${currentYear}-${m}-${d}`;
  };

  // Helper to get bookings for a given date
  const getBookingsForDate = (dateStr: string): CalendarBooking[] => {
    const target = normalizeDateKey(dateStr);
    if (!target) return [];
    return bookings.filter(b => {
      const bDate = normalizeDateKey(b.eventDate);
      const bStart = normalizeDateKey(b.startDate);
      const bEnd = normalizeDateKey(b.endDate);
      if (b.noOfDays === 1) {
        return bDate === target;
      } else {
        return bStart && bEnd && target >= bStart && target <= bEnd;
      }
    });
  };

  const selectedDateBookings = selectedDate ? getBookingsForDate(selectedDate) : [];
  const hasFullDay = selectedDateBookings.some(b => b.noOfDays > 1 || b.timeSlot === 'Full Day');
  const hasFN = selectedDateBookings.some(b => b.noOfDays === 1 && b.timeSlot === 'FN');
  const hasAN = selectedDateBookings.some(b => b.noOfDays === 1 && b.timeSlot === 'AN');

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Calendar Header */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50/50">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Availability Calendar
              {hallName && <span className="text-indigo-600 ml-1">• {hallName}</span>}
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Click any date on the calendar to select it and view booked slots with HOD details.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={jumpToToday}
            className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
          >
            Today
          </button>
          <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-2xs">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded hover:bg-slate-100 text-slate-600 transition-colors"
              title="Previous Month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-slate-800 select-none min-w-[120px] text-center">
              {monthNames[currentMonth]} {currentYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded hover:bg-slate-100 text-slate-600 transition-colors"
              title="Next Month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Days of Week Header */}
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/80 text-center text-[11px] font-bold text-slate-500 uppercase tracking-wider py-2">
        <span className="text-rose-500">Sun</span>
        <span>Mon</span>
        <span>Tue</span>
        <span>Wed</span>
        <span>Thu</span>
        <span>Fri</span>
        <span className="text-indigo-600">Sat</span>
      </div>

      {/* Month Days Grid */}
      <div className="grid grid-cols-7 gap-px bg-slate-200">
        {/* Empty cells before month start */}
        {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
          <div key={`empty-${idx}`} className="bg-slate-50/40 min-h-[90px] p-1.5 sm:p-2 select-none" />
        ))}

        {/* Days of Month */}
        {Array.from({ length: daysInMonth }).map((_, idx) => {
          const day = idx + 1;
          const dateStr = formatDateKey(day);
          const dayBookings = getBookingsForDate(dateStr);
          const isSelected = selectedDate === dateStr;
          const isToday =
            today.getFullYear() === currentYear &&
            today.getMonth() === currentMonth &&
            today.getDate() === day;

          const dayFullDay = dayBookings.filter(b => b.noOfDays > 1 || b.timeSlot === 'Full Day');
          const dayFN = dayBookings.filter(b => b.noOfDays === 1 && b.timeSlot === 'FN');
          const dayAN = dayBookings.filter(b => b.noOfDays === 1 && b.timeSlot === 'AN');

          const hasFull = dayFullDay.length > 0;
          const hasFN = dayFN.length > 0;
          const hasAN = dayAN.length > 0;

          // Determine fixed color styling based on booked type
          let cellTheme = 'bg-white hover:bg-emerald-50/30 border-slate-200/80';
          let dayNumTheme = isToday
            ? 'bg-indigo-600 text-white shadow-xs'
            : isSelected
            ? 'bg-indigo-100 text-indigo-800 font-extrabold'
            : 'text-slate-700 group-hover:text-indigo-600';
          let statusBadge = (
            <span className="hidden sm:inline-block text-[9px] font-semibold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">
              Free
            </span>
          );

          if (hasFull) {
            // FIXED RED/ROSE FOR FULL DAY
            cellTheme = isSelected
              ? 'bg-rose-100/95 ring-2 ring-rose-600 border-rose-400 z-10'
              : 'bg-rose-50/90 hover:bg-rose-100/70 border-rose-300';
            dayNumTheme = 'bg-rose-600 text-white shadow-xs';
            statusBadge = (
              <span className="text-[9px] font-black text-rose-800 bg-rose-200/90 px-1.5 py-0.5 rounded flex items-center gap-1 border border-rose-300 shadow-2xs">
                <Lock className="w-2.5 h-2.5 text-rose-700" /> Full Day
              </span>
            );
          } else if (hasFN && hasAN) {
            // FIXED DUAL COLOR FOR BOTH FN & AN
            cellTheme = isSelected
              ? 'bg-gradient-to-b from-amber-100 to-blue-100 ring-2 ring-indigo-600 border-indigo-400 z-10'
              : 'bg-gradient-to-b from-amber-50/90 to-blue-50/90 hover:opacity-95 border-indigo-200';
            dayNumTheme = 'bg-indigo-700 text-white shadow-xs';
            statusBadge = (
              <span className="text-[9px] font-black text-slate-800 bg-white/95 px-1.5 py-0.5 rounded flex items-center gap-1 border border-slate-300 shadow-2xs">
                <Lock className="w-2.5 h-2.5 text-slate-700" /> FN + AN
              </span>
            );
          } else if (hasFN) {
            // FIXED AMBER/ORANGE FOR FN
            cellTheme = isSelected
              ? 'bg-amber-100/95 ring-2 ring-amber-500 border-amber-400 z-10'
              : 'bg-amber-50/80 hover:bg-amber-100/60 border-amber-300';
            dayNumTheme = 'bg-amber-500 text-slate-950 font-black shadow-xs';
            statusBadge = (
              <span className="text-[9px] font-black text-amber-900 bg-amber-200/90 px-1.5 py-0.5 rounded flex items-center gap-1 border border-amber-300 shadow-2xs">
                <Lock className="w-2.5 h-2.5 text-amber-700" /> FN Booked
              </span>
            );
          } else if (hasAN) {
            // FIXED BLUE/INDIGO FOR AN
            cellTheme = isSelected
              ? 'bg-blue-100/95 ring-2 ring-blue-500 border-blue-400 z-10'
              : 'bg-blue-50/80 hover:bg-blue-100/60 border-blue-300';
            dayNumTheme = 'bg-blue-600 text-white shadow-xs';
            statusBadge = (
              <span className="text-[9px] font-black text-blue-900 bg-blue-200/90 px-1.5 py-0.5 rounded flex items-center gap-1 border border-blue-300 shadow-2xs">
                <Lock className="w-2.5 h-2.5 text-blue-700" /> AN Booked
              </span>
            );
          }

          return (
            <div
              key={`day-${day}`}
              onClick={() => onSelectDate(dateStr)}
              className={`min-h-[92px] p-1.5 sm:p-2 cursor-pointer transition-all relative flex flex-col justify-between group border rounded-lg m-0.5 shadow-2xs ${cellTheme}`}
            >
              {/* Day Header */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full transition-all ${dayNumTheme}`}
                >
                  {day}
                </span>

                {statusBadge}
              </div>

              {/* Badges for Booked Sessions */}
              <div className="space-y-1 my-auto">
                {/* Full Day Booking */}
                {dayFullDay.map(b => (
                  <div
                    key={b.id}
                    className="p-1 rounded-md bg-rose-50 border border-rose-200 text-rose-800 text-[10px] leading-tight font-medium shadow-2xs"
                    title={`Full Day Booked by ${b.hodName} (${b.departmentCode || 'Dept'}) - Status: ${b.status} - ${b.eventTitle || 'Event'}`}
                  >
                    <div className="flex items-center justify-between gap-1 font-bold text-rose-900">
                      <div className="flex items-center gap-1 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-600 flex-shrink-0" />
                        <span className="uppercase text-[9px] font-black">Full Day</span>
                      </div>
                      <span className={`text-[8px] font-bold px-1 rounded uppercase flex-shrink-0 ${
                        b.status === 'Approved' ? 'bg-rose-200/80 text-rose-900' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {b.status}
                      </span>
                    </div>
                    <div className="truncate text-rose-800 text-[9px] mt-0.5 font-semibold">
                      {b.hodName} {b.departmentCode ? `(${b.departmentCode})` : ''}
                    </div>
                  </div>
                ))}

                {/* FN Booking */}
                {dayFN.map(b => (
                  <div
                    key={b.id}
                    className="p-1 rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[10px] leading-tight font-medium shadow-2xs"
                    title={`FN Booked by ${b.hodName} (${b.departmentCode || 'Dept'}) - Status: ${b.status} - ${b.eventTitle || 'Event'}`}
                  >
                    <div className="flex items-center justify-between gap-1 font-bold text-amber-900">
                      <div className="flex items-center gap-1 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 flex-shrink-0" />
                        <span className="uppercase text-[9px] font-black">FN</span>
                      </div>
                      <span className={`text-[8px] font-bold px-1 rounded uppercase flex-shrink-0 ${
                        b.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-200/80 text-amber-900'
                      }`}>
                        {b.status}
                      </span>
                    </div>
                    <div className="truncate text-amber-800 text-[9px] mt-0.5 font-semibold">
                      {b.hodName} {b.departmentCode ? `(${b.departmentCode})` : ''}
                    </div>
                  </div>
                ))}

                {/* AN Booking */}
                {dayAN.map(b => (
                  <div
                    key={b.id}
                    className="p-1 rounded-md bg-blue-50 border border-blue-200 text-blue-900 text-[10px] leading-tight font-medium shadow-2xs"
                    title={`AN Booked by ${b.hodName} (${b.departmentCode || 'Dept'}) - Status: ${b.status} - ${b.eventTitle || 'Event'}`}
                  >
                    <div className="flex items-center justify-between gap-1 font-bold text-blue-900">
                      <div className="flex items-center gap-1 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" />
                        <span className="uppercase text-[9px] font-black">AN</span>
                      </div>
                      <span className={`text-[8px] font-bold px-1 rounded uppercase flex-shrink-0 ${
                        b.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                      }`}>
                        {b.status}
                      </span>
                    </div>
                    <div className="truncate text-blue-800 text-[9px] mt-0.5 font-semibold">
                      {b.hodName} {b.departmentCode ? `(${b.departmentCode})` : ''}
                    </div>
                  </div>
                ))}
              </div>

              {/* Subtle footer */}
              <div className="mt-0.5 flex justify-end">
                {isSelected && (
                  <span className="text-[9px] text-indigo-700 font-black uppercase tracking-wider">
                    Selected
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Color-Code Legend Bar */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 sm:gap-5">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Slot Status Legend:
          </span>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-rose-100 border border-rose-300 inline-block" />
            <span className="text-[11px] font-bold text-rose-800">Full Day Booked</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300 inline-block" />
            <span className="text-[11px] font-bold text-amber-800">Half Day - FN Booked</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300 inline-block" />
            <span className="text-[11px] font-bold text-blue-800">Half Day - AN Booked</span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-emerald-50 border border-emerald-200 inline-block" />
            <span className="text-[11px] font-bold text-emerald-700">Available / Free</span>
          </div>
        </div>

        <span className="text-[11px] text-slate-400 font-medium">
          *Principal can override existing department bookings
        </span>
      </div>

      {/* Selected Date Detail Inspection Card */}
      {selectedDate && (
        <div className="p-4 bg-indigo-50/40 border-t border-indigo-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                Selected Date:
              </span>
              <strong className="text-slate-800 text-sm font-black">
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString(undefined, {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </strong>
            </div>

            {/* Availability details for this date */}
            <div className="flex flex-wrap items-center gap-2 text-xs pt-1">
              {hasFullDay ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 text-rose-900 border border-rose-300 font-extrabold shadow-2xs">
                  <Lock className="w-3.5 h-3.5 text-rose-700" />
                  Full Day Booked – Access Blocked for Other HODs
                </span>
              ) : (
                <>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold border shadow-2xs ${
                      hasFN
                        ? 'bg-amber-100 text-amber-950 border-amber-300'
                        : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    }`}
                  >
                    {hasFN ? <Lock className="w-3.5 h-3.5 text-amber-700" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    FN: {hasFN ? 'Reserved (Locked)' : 'Available (Free)'}
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold border shadow-2xs ${
                      hasAN
                        ? 'bg-blue-100 text-blue-950 border-blue-300'
                        : 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    }`}
                  >
                    {hasAN ? <Lock className="w-3.5 h-3.5 text-blue-700" /> : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                    AN: {hasAN ? 'Reserved (Locked)' : 'Available (Free)'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Bookings breakdown list for the selected date */}
          {selectedDateBookings.length > 0 && (
            <div className="text-xs space-y-1.5 w-full md:w-auto bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Reservations on this day:
              </span>
              {selectedDateBookings.map(b => (
                <div key={b.id} className="flex items-center gap-2 text-slate-700">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                      b.noOfDays > 1 || b.timeSlot === 'Full Day'
                        ? 'bg-rose-100 text-rose-800'
                        : b.timeSlot === 'FN'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {b.noOfDays > 1 ? 'Multi-day' : b.timeSlot}
                  </span>
                  <span className="font-bold text-slate-800">{b.hodName}</span>
                  {b.departmentCode && (
                    <span className="text-slate-500">({b.departmentCode})</span>
                  )}
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                    b.status === 'Approved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}>
                    {b.status}
                  </span>
                  {b.eventTitle && (
                    <span className="text-slate-500 italic truncate max-w-[180px]">
                      - "{b.eventTitle}"
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
