const pool = require('../db');

const projectController = {
    // Get all projects for the current user's department
    getAllProjects: async (req, res) => {
        console.log('🔍 getAllProjects endpoint hit');
        try {
            // Get user's department_id through the user_departments junction table
            const userResult = await pool.query(
                `SELECT ud.department_id 
                 FROM user_departments ud 
                 WHERE ud.user_id = $1 
                 LIMIT 1`,
                [req.user.id]
            );
            
            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: 'User not found or not assigned to any department' });
            }
            
            const userDepartmentId = userResult.rows[0].department_id;
            console.log('🔍 Filtering projects for department_id:', userDepartmentId);
            
            const result = await pool.query(
                'SELECT id, name, description, created_at, updated_at, position FROM projects WHERE department_id = $1 AND deleted_at IS NULL ORDER BY position ASC, created_at ASC',
                [userDepartmentId]
            );
            
            console.log('✅ Found', result.rows.length, 'projects for department', userDepartmentId);
            res.status(200).json({
                success: true,
                projects: result.rows,
                message: 'Projects retrieved successfully'
            });
        } catch (err) {
            console.error('❌ Error in getAllProjects:', err.message);
            console.error('Full error stack:', err.stack);
            res.status(500).json({ error: 'Server error', details: err.message });
        }
    },

    // Create new project
    createProject: async (req, res) => {
        console.log('🔍 createProject endpoint hit');
        console.log('Request body:', req.body);
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { name, description } = req.body;

            if (!req.user || !req.user.id) {
                await client.query('ROLLBACK');
                console.log('❌ No authenticated user found');
                return res.status(401).json({ error: 'User not authenticated' });
            }

            // Validate required fields
            if (!name || !name.trim()) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: 'Missing required fields',
                    message: 'Project name is required' 
                });
            }

            // Validate name format (letters and numbers only)
            const nameRegex = /^[a-zA-Z0-9\s]+$/;
            if (!nameRegex.test(name.trim())) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: 'Invalid project name',
                    message: 'Project name can only contain letters, numbers, and spaces' 
                });
            }

            // Get user's department_id through the user_departments junction table
            const userResult = await client.query(
                `SELECT ud.department_id 
                 FROM user_departments ud 
                 WHERE ud.user_id = $1 
                 LIMIT 1`,
                [req.user.id]
            );
            
            if (userResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'User not found or not assigned to any department' });
            }
            
            const userDepartmentId = userResult.rows[0].department_id;

            // Check if project name already exists in this department (excluding deleted projects)
            const existingProjectResult = await client.query(
                'SELECT id FROM projects WHERE name = $1 AND department_id = $2 AND deleted_at IS NULL',
                [name.trim(), userDepartmentId]
            );
            
            if (existingProjectResult.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({ 
                    error: 'Project already exists',
                    message: 'A project with this name already exists in your department' 
                });
            }

            // Create the project
            const result = await client.query(
                'INSERT INTO projects (name, description, department_id, created_at, updated_at) VALUES ($1, $2, $3, NOW(), NOW()) RETURNING *',
                [name.trim(), description || null, userDepartmentId]
            );

            const newProject = result.rows[0];

            await client.query('COMMIT');
            console.log('✅ Project created successfully:', newProject);
            res.status(201).json({
                success: true,
                project: newProject,
                message: 'Project created successfully'
            });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('❌ Error in createProject:', err.message);
            console.error('Full error stack:', err.stack);
            res.status(500).json({ error: 'Server error', details: err.message });
        } finally {
            client.release();
        }
    },

    // Update project
    updateProject: async (req, res) => {
        console.log('🔍 updateProject endpoint hit for ID:', req.params.id);
        console.log('Request body:', req.body);
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { id } = req.params;
            const { name, description } = req.body;

            if (!req.user || !req.user.id) {
                await client.query('ROLLBACK');
                console.log('❌ No authenticated user found');
                return res.status(401).json({ error: 'User not authenticated' });
            }

            // Validate required fields
            if (!name || !name.trim()) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: 'Missing required fields',
                    message: 'Project name is required' 
                });
            }

            // Validate name format (letters and numbers only)
            const nameRegex = /^[a-zA-Z0-9\s]+$/;
            if (!nameRegex.test(name.trim())) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: 'Invalid project name',
                    message: 'Project name can only contain letters, numbers, and spaces' 
                });
            }

            // Get user's department_id through the user_departments junction table
            const userResult = await client.query(
                `SELECT ud.department_id 
                 FROM user_departments ud 
                 WHERE ud.user_id = $1 
                 LIMIT 1`,
                [req.user.id]
            );
            
            if (userResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'User not found or not assigned to any department' });
            }
            
            const userDepartmentId = userResult.rows[0].department_id;

            // Check if project exists and belongs to user's department
            const existingProjectResult = await client.query(
                'SELECT id FROM projects WHERE id = $1 AND department_id = $2 AND deleted_at IS NULL',
                [id, userDepartmentId]
            );
            
            if (existingProjectResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Project not found' });
            }

            // Check if new name already exists in this department (excluding current project)
            const duplicateNameResult = await client.query(
                'SELECT id FROM projects WHERE name = $1 AND department_id = $2 AND id != $3 AND deleted_at IS NULL',
                [name.trim(), userDepartmentId, id]
            );
            
            if (duplicateNameResult.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(409).json({ 
                    error: 'Project name already exists',
                    message: 'A project with this name already exists in your department' 
                });
            }

            // Update the project
            const result = await client.query(
                'UPDATE projects SET name = $1, description = $2, updated_at = NOW() WHERE id = $3 AND department_id = $4 AND deleted_at IS NULL RETURNING *',
                [name.trim(), description || null, id, userDepartmentId]
            );

            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Project not found' });
            }

            const updatedProject = result.rows[0];

            await client.query('COMMIT');
            console.log('✅ Project updated successfully:', updatedProject);
            res.status(200).json({
                success: true,
                project: updatedProject,
                message: 'Project updated successfully'
            });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('❌ Error in updateProject:', err.message);
            console.error('Full error stack:', err.stack);
            res.status(500).json({ error: 'Server error', details: err.message });
        } finally {
            client.release();
        }
    },

    // Delete project (soft delete)
    deleteProject: async (req, res) => {
        console.log('🔍 deleteProject endpoint hit for ID:', req.params.id);
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { id } = req.params;

            if (!req.user || !req.user.id) {
                await client.query('ROLLBACK');
                console.log('❌ No authenticated user found');
                return res.status(401).json({ error: 'User not authenticated' });
            }

            // Get user's department_id through the user_departments junction table
            const userResult = await client.query(
                `SELECT ud.department_id 
                 FROM user_departments ud 
                 WHERE ud.user_id = $1 
                 LIMIT 1`,
                [req.user.id]
            );
            
            if (userResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'User not found or not assigned to any department' });
            }
            
            const userDepartmentId = userResult.rows[0].department_id;

            // Check if project exists and belongs to user's department
            const existingProjectResult = await client.query(
                'SELECT id FROM projects WHERE id = $1 AND department_id = $2 AND deleted_at IS NULL',
                [id, userDepartmentId]
            );
            
            if (existingProjectResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Project not found' });
            }

            // Soft delete the project
            const result = await client.query(
                'UPDATE projects SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND department_id = $2 AND deleted_at IS NULL RETURNING id',
                [id, userDepartmentId]
            );

            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Project not found' });
            }

            await client.query('COMMIT');
            console.log('✅ Project soft deleted successfully, ID:', id);
            res.status(200).json({
                success: true,
                message: 'Project deleted successfully'
            });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('❌ Error in deleteProject:', err.message);
            console.error('Full error stack:', err.stack);
            res.status(500).json({ error: 'Server error', details: err.message });
        } finally {
            client.release();
        }
    },

    // Get project by ID
    getProjectById: async (req, res) => {
        console.log('🔍 getProjectById endpoint hit for ID:', req.params.id);
        try {
            const { id } = req.params;
            
            // Get user's department_id through the user_departments junction table
            const userResult = await pool.query(
                `SELECT ud.department_id 
                 FROM user_departments ud 
                 WHERE ud.user_id = $1 
                 LIMIT 1`,
                [req.user.id]
            );
            
            if (userResult.rows.length === 0) {
                return res.status(404).json({ error: 'User not found or not assigned to any department' });
            }
            
            const userDepartmentId = userResult.rows[0].department_id;
            
            const result = await pool.query(
                'SELECT id, name, description, created_at, updated_at FROM projects WHERE id = $1 AND department_id = $2 AND deleted_at IS NULL',
                [id, userDepartmentId]
            );
            
            if (result.rows.length === 0) {
                console.log('❌ Project not found for ID:', id, 'in department:', userDepartmentId);
                return res.status(404).json({ error: 'Project not found' });
            }
            
            console.log('✅ Project found:', result.rows[0]);
            res.status(200).json({
                success: true,
                project: result.rows[0],
                message: 'Project retrieved successfully'
            });
        } catch (err) {
            console.error('❌ Error in getProjectById:', err.message);
            console.error('Full error stack:', err.stack);
            res.status(500).json({ error: 'Server error', details: err.message });
        }
    },

    // Reorder projects
    reorderProjects: async (req, res) => {
        console.log('🔍 reorderProjects endpoint hit');
        console.log('Request body:', req.body);
        
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const { projectIds } = req.body;

            if (!req.user || !req.user.id) {
                await client.query('ROLLBACK');
                console.log('❌ No authenticated user found');
                return res.status(401).json({ error: 'User not authenticated' });
            }

            // Validate required fields
            if (!projectIds || !Array.isArray(projectIds) || projectIds.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({ 
                    error: 'Invalid input',
                    message: 'projectIds array is required and must not be empty' 
                });
            }

            // Get user's department_id through the user_departments junction table
            const userResult = await client.query(
                `SELECT ud.department_id 
                 FROM user_departments ud 
                 WHERE ud.user_id = $1 
                 LIMIT 1`,
                [req.user.id]
            );
            
            if (userResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'User not found or not assigned to any department' });
            }
            
            const userDepartmentId = userResult.rows[0].department_id;

            // Verify all projects belong to user's department
            const projectIdsString = projectIds.map((_, index) => `$${index + 2}`).join(',');
            const verifyProjectsResult = await client.query(
                `SELECT id FROM projects 
                 WHERE id IN (${projectIdsString}) 
                 AND department_id = $1 
                 AND deleted_at IS NULL`,
                [userDepartmentId, ...projectIds]
            );
            
            if (verifyProjectsResult.rows.length !== projectIds.length) {
                await client.query('ROLLBACK');
                return res.status(403).json({ 
                    error: 'Invalid projects',
                    message: 'Some projects do not belong to your department or do not exist' 
                });
            }

            // Update positions for all projects
            for (let i = 0; i < projectIds.length; i++) {
                await client.query(
                    'UPDATE projects SET position = $1, updated_at = NOW() WHERE id = $2 AND department_id = $3',
                    [i + 1, projectIds[i], userDepartmentId]
                );
            }

            await client.query('COMMIT');
            console.log('✅ Projects reordered successfully');
            res.status(200).json({
                success: true,
                message: 'Projects reordered successfully'
            });
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('❌ Error in reorderProjects:', err.message);
            console.error('Full error stack:', err.stack);
            res.status(500).json({ error: 'Server error', details: err.message });
        } finally {
            client.release();
        }
    }
};

module.exports = projectController; 