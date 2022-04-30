/** @format */

import { BaseService, ServiceMountType } from '..';
import { Router, Request, Response, NextFunction } from 'express';
import express from 'express';
import axios, { AxiosError } from 'axios';

class TestService extends BaseService {
	constructor() {
		super({
			MountType: ServiceMountType.PathComponent,
			Namespace: 'test',
			Hostname: 'localhost',
			Router: Router(),
		});

		this.#Initialize();
	}

	#Initialize() {
		const Router = this.Router;

		Router.get('/', EchoFunction).get('/hi', EchoFunction);

		function EchoFunction(req: Request, res: Response, next: NextFunction) {
			res.end('This is a TestService route.');
		}
	}
}

describe('services', () => {
	const app = express();
	const srv = app.listen(1337);
	it('should mount/unmount the service properly and handle routes', async () => {
		const TService = new TestService();

		TService.Mount(app);

		expect(TService.MountLocation).toBe(app);
		expect(TService.Mounted).toBe(true);

		expect(await axios.get(`http://localhost:1337/test`)).toHaveProperty('data', 'This is a TestService route.')

		TService.Unmount();

		expect(axios.get(`http://localhost:1337/test`)).rejects.toBeInstanceOf(AxiosError);
	});

	afterAll(() => srv.close());
});