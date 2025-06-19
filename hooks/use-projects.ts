import { ProjectDetails } from '@/lib/database';

export async function fetchProjects(): Promise<ProjectDetails[]> {
    const res = await fetch('/api/projects');
    if (!res.ok) throw new Error('Failed to fetch projects');
    const data = await res.json();
    return data.projects as ProjectDetails[];
}
