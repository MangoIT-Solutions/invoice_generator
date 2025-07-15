import { ProjectDetail } from '../model/project.model';

export async function getAllProjects() {
  try {
    const projects = await ProjectDetail.findAll({
      order: [['project_id', 'DESC']],
    });
    return projects.map((p) => p.get());
  } catch (error) {
    console.error('Error fetching projects:', error);
    return [];
  }
}
