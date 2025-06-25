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

const CalendarView = ({ onSprintDoubleClick, user }) => {
  const [sprintEvents, setSprintEvents] = useState([]);
  const [taskEvents, setTaskEvents] = useState([]);
  const [filters, setFilters] = useState({
    text: '',
    project: '',
    sprint: '',
    priority: '',
    assignee: '',
    status: '',
    changedInTime: ''
  });
  const [selectedProject] = useState(null);

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
            color: '#6c757d', // gray color for backlog
            type: 'backlog'
          };
          
          setSprintEvents([...events, backlogEvent]);
        }
      } catch (err) {
        setSprintEvents([]);
      }
    };
    fetchSprints();
  }, []);

  // Fetch tasks based on filters
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const params = new URLSearchParams();
        if (filters.project) params.append('project', filters.project);
        if (filters.sprint) params.append('sprint', filters.sprint);
        if (filters.priority) params.append('priority', filters.priority);
        if (filters.assignee) params.append('assignee', filters.assignee);
        if (filters.status) params.append('status', filters.status);
        if (filters.text) params.append('search', filters.text);

        const res = await api.get(`/api/tasks?${params.toString()}`);
        const data = res.data;
        if (data.tasks) {
          const events = data.tasks
            .filter(task => task.duedate) // Only show tasks with due dates
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
          setTaskEvents(events);
        }
      } catch (err) {
        setTaskEvents([]);
      }
    };
    fetchTasks();
  }, [filters]);

  // Helper function to get task color based on priority and status
  const getTaskColor = (priority, status) => {
    if (status === 'done') return '#10b981'; // Green for done
    if (priority === 'high') return '#ef4444'; // Red for high priority
    if (priority === 'medium') return '#f59e0b'; // Amber for medium priority
    return '#6b7280'; // Gray for low priority
  };

  // Merge sprints and task events
  const allEvents = [...sprintEvents, ...taskEvents];

  // Custom event style getter
  const eventPropGetter = (event) => {
    return {
      style: {
        backgroundColor: event.color || '#1976d2',
        color: '#fff',
        borderRadius: '4px',
        border: 'none',
        padding: '2px 6px',
        fontWeight: 500,
      },
    };
  };

  // Double click handler
  const handleDoubleClickEvent = (event) => {
    if (event.type === 'sprint' && event.id && onSprintDoubleClick) {
      onSprintDoubleClick(event.id);
    } else if (event.type === 'task') {
      // Handle task double click - could open task modal or navigate to task
      console.log('Task clicked:', event.task);
    }
  };

  return (
    <div style={{ height: 'calc(100vh - 120px)', width: '100%', background: '#fff', padding: 16 }}>
      <TaskFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        selectedProject={selectedProject}
        user={user}
      />
      <div style={{ marginTop: '16px', height: 'calc(100% - 80px)' }}>
        <Calendar
          localizer={localizer}
          events={allEvents}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%', minHeight: 500 }}
          views={['month', 'week', 'day']}
          defaultView="month"
          popup
          eventPropGetter={eventPropGetter}
          onDoubleClickEvent={handleDoubleClickEvent}
        />
      </div>
    </div>
  );
};

CalendarView.propTypes = {
  onSprintDoubleClick: PropTypes.func,
  user: PropTypes.object,
};

export default CalendarView; 