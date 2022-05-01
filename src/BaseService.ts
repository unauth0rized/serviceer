/** @format */

import { Request, Response, Application, Router } from 'express';
import { EventEmitter } from 'events';
import assert from 'assert/strict';
import vhost from 'vhost';
import CheckHostname from 'is-valid-hostname';
import { v4 as uuid } from 'uuid';

enum ServiceMountType {
	Subdomain = 'Subdomain',
	PathComponent = 'PathComponent',
}

const NormalizeNamespace = (
	Namespace: string,
	Mode: ServiceMountType
): string => {
	switch (Mode) {
		case ServiceMountType.Subdomain:
			const SubdomainComponents = Namespace.split('.')
				.filter((_) => _.replaceAll(' ', '') !== '')
				.map((_) => _.toLowerCase())
				.reverse();
			return SubdomainComponents.join('.');
		case ServiceMountType.PathComponent:
			const PathComponents = Namespace.split('.')
				.filter((_) => _.replaceAll(' ', '') !== '')
				.map((_) => _.toLowerCase());
			return PathComponents.join('/');
		default:
			return 'unknown';
	}
};

declare interface BaseService {
	on(Event: string, Listener: Function): this;
}

interface IBaseService {
	Namespace: string;
	Router: Router;
	Hostname: string;
	Mount(Container: Application | BaseService): void;
	Unmount(): void;
	MountType: ServiceMountType;
	Mounted: boolean;
	MountLocation: Application | BaseService | undefined;
}

interface BaseServiceConfiguration {
	Namespace: string;
	Hostname: string;
	Router: Router;
	MountType?: ServiceMountType;
}

const LayerMappings: Map<string, object> = new Map<string, object>();

class BaseService extends EventEmitter implements IBaseService {
	constructor(Configuration: BaseServiceConfiguration) {
		super();

		let { Namespace, Hostname, Router, MountType } = Configuration;

		MountType = MountType || ServiceMountType.Subdomain;

		assert(CheckHostname(Hostname), 'invalid hostname');

		this.setMaxListeners(Infinity);

		this.Namespace = Namespace;
		this.Hostname = Hostname;
		this.Router = Router;
		this.MountType = MountType;
	}

	public Mount(Container: BaseService | Application): void {
		assert(!this.Mounted, 'this service is already mounted!');
		if (this.MountType === ServiceMountType.Subdomain) {
			if (Container instanceof BaseService) {
				Container.Router.use(
					vhost(
						`${NormalizeNamespace(
							this.Namespace,
							this.MountType
						)}.${this.Hostname}`,
						this.Router
					)
				);
			} else {
				Container.use(
					vhost(
						`${NormalizeNamespace(
							this.Namespace,
							this.MountType
						)}.${this.Hostname}`,
						this.Router
					)
				);
			}
		} else if (this.MountType === ServiceMountType.PathComponent) {
			if (Container instanceof BaseService) {
				const MatchString = `/${NormalizeNamespace(
					this.Namespace,
					this.MountType
				)}`;
				Container.Router.use(MatchString, this.Router);

				const Stack = Container.Router.stack as unknown[];
				const MountIdentifier = uuid();
				this.LastMountIdentifier = MountIdentifier;
				LayerMappings.set(MountIdentifier, Stack?.at(-1) as object);
			} else {
				const MatchString = `/${NormalizeNamespace(
					this.Namespace,
					this.MountType
				)}`;
				Container.use(MatchString, this.Router);

				const Stack =
					Container._router !== undefined
						? (Container._router.stack as unknown[])
						: undefined;
				const MountIdentifier = uuid();
				this.LastMountIdentifier = MountIdentifier;
				LayerMappings.set(MountIdentifier, Stack?.at(-1) as object);
			}
		}
		this.Mounted = true;
		this.MountLocation = Container;
	}

	public Unmount(): void {
		assert(this.Mounted, 'this service is not currently mounted.');

		if (LayerMappings.has(this.LastMountIdentifier!)) {
			const Layer: unknown = LayerMappings.get(this.LastMountIdentifier!);
			const Container = this.MountLocation;
			if (Container instanceof BaseService) {
				const Stack = Container.Router.stack as unknown[];
				Container.Router.stack = Stack.filter((X) => X !== Layer);
			} else if (typeof Container === 'function') {
				const Stack =
					Container._router !== undefined
						? (Container._router.stack as unknown[])
						: undefined;
				if (Stack) {
					Container._router!.stack! = Stack.filter(
						(X) => X !== Layer
					);
				}
			}

			LayerMappings.delete(this.LastMountIdentifier!);
			this.Mounted = false;
			this.MountLocation = undefined;
			this.LastMountIdentifier = undefined;
		}
	}

	public readonly Namespace: string;
	public readonly Hostname: string;
	public readonly Router: Router;
	public Mounted: boolean = false;
	public MountLocation: BaseService | Application | undefined;
	public readonly MountType: ServiceMountType = ServiceMountType.Subdomain;

	private LastMountIdentifier: string | undefined;
}

export { BaseService, ServiceMountType };
