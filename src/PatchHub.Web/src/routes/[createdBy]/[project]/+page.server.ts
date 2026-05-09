import { db } from '$lib/server/db/index.js';
import { organization, project as projectTable, user } from '$lib/server/db/schema.js';
import { error } from '@sveltejs/kit';
import { and, eq, isNull, or } from 'drizzle-orm';

export async function load({ params }) {
	const { createdBy, project } = params;
	const item = await getProject(createdBy, project);
	if (!item) error(404, 'Not found');

	return {
		item
	};
}

async function getProject(createdBy: string, projectName: string) {
	// Query with left joins to both user and organization tables
	const result = await db
		.select({
			id: projectTable.id,
			name: projectTable.name,
			normalizedName: projectTable.normalizedName,
			slug: projectTable.slug
		})
		.from(projectTable)
		.leftJoin(user, and(eq(projectTable.userId, user.id), isNull(user.deletedAt)))
		.leftJoin(
			organization,
			and(eq(projectTable.orgId, organization.id), isNull(organization.deletedAt))
		)
		.where(
			and(
				eq(projectTable.slug, projectName.toLowerCase()),
				or(
					eq(user.username, createdBy.toLowerCase()),
					eq(organization.slug, createdBy.toLowerCase())
				),
				isNull(projectTable.deletedAt)
			)
		);

	return result[0];
}
