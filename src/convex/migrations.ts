import { Migrations } from '@convex-dev/migrations';
import { components } from './_generated/api';
import type { DataModel } from './_generated/dataModel';

const migrations = new Migrations<DataModel>(components.migrations);

export const removeExternalItemLegacyFields = migrations.define({
	table: 'externalItems',
	parallelize: true,
	migrateOne: () => ({
		normalizedName: undefined,
		searchName: undefined,
		appType: undefined,
		source: undefined,
		createdAt: undefined
	})
});

export const removeUserCreatedAt = migrations.define({
	table: 'users',
	parallelize: true,
	migrateOne: () => ({ createdAt: undefined })
});

export const removeOrganizationCreatedAt = migrations.define({
	table: 'organizations',
	parallelize: true,
	migrateOne: () => ({ createdAt: undefined })
});

export const removeProjectCreatedAt = migrations.define({
	table: 'projects',
	parallelize: true,
	migrateOne: () => ({ createdAt: undefined })
});

export const removeProjectPostCreatedAt = migrations.define({
	table: 'projectPosts',
	parallelize: true,
	migrateOne: () => ({ createdAt: undefined })
});
