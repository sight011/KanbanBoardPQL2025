// import React, { useEffect, useState } from 'react';
import { useEffect, useState } from 'react';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import enUS from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import PropTypes from 'prop-types';
import TaskFilters from './TaskBoard/TaskFilters';
import api from '../api/axios';

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

  useEffect(() => {
    const fetchSprints = async () => {
      try {
        const res = await api.get('/api/sprints');
        const data = res.data;
        if (data.sprints) {
          const events = data.sprints.map((sprint, idx) => ({
            id: sprint.id,
            title: sprint.name,
            start: sprint.start_date ? new Date(sprint.start_date) : null,
            end: sprint.end_date ? new Date(sprint.end_date) : null,
            allDay: true,
            color: colorPalette[idx % colorPalette.length],
            type: 'sprint'
          })).filter(e => e.start && e.end);
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
          setSprintEvents([...events, backlogEvent]);
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

  // Ensure allEvents have Date objects for start/end
  const allEventsForCalendar = allEvents.map(e => ({
    ...e,
    start: typeof e.start === 'string' ? new Date(e.start) : e.start,
    end: typeof e.end === 'string' ? new Date(e.end) : e.end,
  }));

  return (
    <div className="calendar-view-outer">
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
        />
      </div>
    </div>
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