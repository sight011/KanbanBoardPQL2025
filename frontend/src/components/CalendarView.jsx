// import React, { useEffect, useState } from 'react';
import { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import PropTypes from 'prop-types';
import TaskFilters from './TaskBoard/TaskFilters';
import api from '../api/axios';
import { useTheme } from '../context/ThemeContext';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

const colorPalette = [
  '#1976d2', // blue
  '#388e3c', // green
  '#fbc02d', // yellow
  '#d32f2f', // red
  '#7b1fa2', // purple
  '#0288d1', // light blue
  '#c2185b', // pink
  '#ffa000', // orange
  '#388e3c', // dark green
  '#455a64', // blue grey
];

const CalendarView = ({ onSprintDoubleClick, user, filters, setFilters, tasks, projects }) => {
  const [sprintEvents, setSprintEvents] = useState([]);
  const { theme } = useTheme();

  // Use selected project from filters
  const selectedProject = projects && filters.project
    ? projects.find(p => String(p.id) === String(filters.project))
    : null;

  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleDownloadICS = async () => {
    try {
      // Get user's company ID from the user object
      const companyId = user?.company_id;
      if (!companyId) {
        console.error('User company ID not found');
        return;
      }

      // Create a temporary link element to trigger the download
      const link = document.createElement('a');
      link.href = `/api/sprints/company/${companyId}/calendar.ics`;
      link.download = `kanban-calendar-${new Date().toISOString().split('T')[0]}.ics`;
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading calendar:', error);
    }
  };

  useEffect(() => {
    const fetchSprints = async () => {
      try {
        const res = await api.get('/api/sprints');
        const data = res.data;
        console.log('Fetched sprints data:', data);
        if (data.sprints) {
          const events = data.sprints.map((sprint, idx) => {
            const start = sprint.start_date ? new Date(sprint.start_date) : null;
            // Add one day to end date for all-day event coverage
            const end = sprint.end_date ? new Date(new Date(sprint.end_date).getTime() + 24 * 60 * 60 * 1000) : null;
            // Set color: Flex – Sprint 1 gets light blue, others use palette
            let color = colorPalette[idx % colorPalette.length];
            if (sprint.name && sprint.name.toLowerCase().includes('flex') && sprint.name.toLowerCase().includes('sprint 1')) {
              color = '#42a5f5'; // light blue
            }
            const event = {
              id: sprint.id,
              title: `🏃 ${sprint.name}`,
              start,
              end,
              allDay: true,
              color,
              type: 'sprint',
              sprint: sprint
            };
            console.log('Created sprint event:', event);
            return event;
          }).filter(e => e.start && e.end);
          
          console.log('Filtered sprint events:', events);
          
          // Add a special "Backlog" event
          const backlogEvent = {
            id: 'backlog',
            title: '📋 Backlog',
            start: new Date(),
            end: new Date(),
            allDay: true,
            color: '#6c757d',
            type: 'backlog'
          };
          
          const allSprintEvents = [...events, backlogEvent];
          console.log('All sprint events to set:', allSprintEvents);
          setSprintEvents(allSprintEvents);
        }
      } catch (err) {
        console.error('Failed to fetch sprints', err);
      }
    };
    fetchSprints();
  }, []);

  // Helper function to get task color based on priority and status
  const getTaskColor = (priority, status) => {
    if (status === 'done') return '#10b981'; // Green for done
    if (priority === 'high') return '#ef4444'; // Red for high priority
    if (priority === 'medium') return '#f59e0b'; // Amber for medium priority
    return '#6b7280'; // Gray for low priority
  };

  // Use tasks prop to generate task events
  const taskEvents = (tasks || [])
    .filter(task => task.duedate)
    .map((task) => ({
      id: task.id,
      title: `${task.ticket_number}: ${task.title}`,
      start: new Date(task.duedate),
      end: new Date(task.duedate),
      allDay: true,
      color: getTaskColor(task.priority, task.status),
      type: 'task',
      task: task
    }));
  console.log('Task events:', taskEvents);
  console.log('Sprint events state:', sprintEvents);

  // Double click handler
  const handleDoubleClickEvent = (event) => {
    if (event.type === 'sprint' && event.id && onSprintDoubleClick) {
      onSprintDoubleClick(event.id);
    } else if (event.type === 'task') {
      // Handle task double click - could open task modal or navigate to task
      console.log('Task clicked:', event.task);
    }
  };

  // Combine sprint and task events
  const allEvents = [...sprintEvents, ...taskEvents];
  console.log('Combined all events:', allEvents);

  // Add a hardcoded test event for June 24, 2025
  const testEvent = {
    id: 'test',
    title: 'Test Event',
    start: new Date(2025, 5, 24), // June 24, 2025
    end: new Date(2025, 5, 25),   // June 25, 2025
    allDay: true,
    color: '#ff0000',
    type: 'sprint'
  };

  // Ensure allEvents have Date objects for start/end, and add test event
  const allEventsForCalendar = [
    ...allEvents.map(e => ({
      ...e,
      start: typeof e.start === 'string' ? new Date(e.start) : e.start,
      end: typeof e.end === 'string' ? new Date(e.end) : e.end,
    })),
    testEvent
  ];
  
  console.log('Final events for calendar:', allEventsForCalendar);

  // Custom event component to make sprints more visible
  const EventComponent = ({ event }) => {
    const isSprint = event.type === 'sprint';
    
    return (
      <div
        style={{
          color: 'white',
          fontSize: '12px',
          fontWeight: isSprint ? 'bold' : 'normal',
          textShadow: isSprint ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}
        title={event.title}
      >
        {event.title}
      </div>
    );
  };

  EventComponent.propTypes = {
    event: PropTypes.shape({
      color: PropTypes.string,
      type: PropTypes.string,
      title: PropTypes.string,
    }).isRequired,
  };

  // Style override for react-big-calendar month cells
  const calendarFixStyle = `
    .rbc-month-row .rbc-date-cell,
    .rbc-month-row .rbc-day-bg {
      aspect-ratio: unset !important;
      height: auto !important;
      min-height: 48px !important;
      max-height: 120px !important;
      padding: 0 !important;
    }
    .rbc-date-cell {
      padding-top: 0 !important;
      vertical-align: top !important;
    }
    .rbc-row-segment {
      margin-top: 0 !important;
      padding-top: 0 !important;
    }
    .rbc-event {
      margin-top: 0 !important;
      margin-bottom: 2px !important;
      margin-left: 2px !important;
      padding: 2px 6px !important;
      border-radius: 4px !important;
      min-width: 60px !important;
      border: none !important;
    }
    .rbc-allday-cell {
      padding-top: 0 !important;
      padding-bottom: 0 !important;
      min-height: 0 !important;
    }
    .rbc-toolbar-label {
      font-weight: bold !important;
      font-size: 18px !important;
    }
    .rbc-event.rbc-selected {
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      border: 2px solid #3182ce;
    }
    .sprint-effort-sum {
      width: 266px !important;
    }
  `;

  return (
    <>
      <style>{calendarFixStyle}</style>
      <div className="calendar-view-outer">
        <div className="calendar-header" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '16px',
          color: theme === 'dark' ? '#fff' : '#000'
        }}>
          <h2 style={{ margin: 0 }}>Calendar View</h2>
          <button
            onClick={handleDownloadICS}
            style={{
              padding: '8px 16px',
              backgroundColor: theme === 'dark' ? '#3182ce' : '#1976d2',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? '#2c5aa0' : '#1565c0';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = theme === 'dark' ? '#3182ce' : '#1976d2';
            }}
            title="Download calendar as ICS file"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7,10 12,15 17,10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export Calendar
          </button>
        </div>
        <TaskFilters
          filters={filters}
          onFilterChange={handleFilterChange}
          selectedProject={selectedProject}
          user={user}
        />
        <div id="calendar-inner-wrapper" style={{ marginTop: '16px' }}>
          <Calendar
            localizer={localizer}
            events={allEventsForCalendar}
            startAccessor="start"
            endAccessor="end"
            style={{ minHeight: 500, width: '100%' }}
            onDoubleClickEvent={handleDoubleClickEvent}
            components={{
              event: EventComponent
            }}
            eventPropGetter={(event) => ({
              style: {
                backgroundColor: event.color || '#1976d2',
                border: event.type === 'sprint' ? '2px solid #fff' : '1px solid rgba(255,255,255,0.3)',
                borderRadius: '3px',
                color: 'white',
                fontWeight: event.type === 'sprint' ? 'bold' : 'normal'
              }
            })}
          />
        </div>
      </div>
    </>
  );
};

CalendarView.propTypes = {
  onSprintDoubleClick: PropTypes.func,
  user: PropTypes.object,
  filters: PropTypes.object.isRequired,
  setFilters: PropTypes.func.isRequired,
  tasks: PropTypes.array,
  projects: PropTypes.array,
};

export default CalendarView; 