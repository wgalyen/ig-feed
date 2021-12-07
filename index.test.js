const msw = require('msw');
const setupServer = require('msw/node').setupServer;
const main = require('./index');
const fs = require('fs');

describe('main', () => {
  describe('getRecentMedia', () => {
    const validToken = 'abc123';

    const recentMediaJson = [{
      media_url: 'http://media_url',
      permalink: 'http://permalink'
    }];

    const mockServer = (url, response) => {
      return setupServer(
        msw.rest.get(
          url,
          (req, res, ctx) => {
            const accessToken = req.url.searchParams.get('access_token');

            if (accessToken === validToken) {
              return res(ctx.json(response));
            }

            return res(
              ctx.status(400),
              ctx.json({
                error: {
                  message: 'Invalid OAuth access token',
                  type: 'OAuthException',
                  code: 190,
                }
              })
            )
          }
        )
      );
    };

    let server;

    beforeAll(() => {
      server = mockServer(
        'https://graph.instagram.com/bellhelmets/media',
        recentMediaJson
      );

      server.listen();
    });

    beforeEach(() => {
      jest.resetModules();
      jest.resetAllMocks();

      jest.spyOn(main, 'error').mockImplementation(jest.fn());
      jest.spyOn(fs.promises, 'writeFile').mockImplementation(jest.fn());
    });

    afterEach(() => {
      server.resetHandlers();
      delete process.env.IG_ACCESS_TOKEN;
    });

    afterAll(() => server.close());

    describe('when a valid IG_ACCESS_TOKEN environment variable is provided', () => {
      beforeEach(async () => {
        process.env.IG_ACCESS_TOKEN = validToken;
        await main.getRecentMedia();
      });

      it('writes the Instagram API response JSON to a "media.json" file', async () => {
        expect(fs.promises.writeFile).toHaveBeenCalledWith(
          'media.json',
          JSON.stringify(recentMediaJson)
        );
      });
    });

    describe('when no IG_ACCESS_TOKEN environment variable is provided', () => {
      beforeEach(async () => {
        await main.getRecentMedia();
      });

      it('errors with an informative message', () => {
        expect(main.error).toHaveBeenCalledWith('Missing required environment variable "IG_ACCESS_TOKEN."')
      });
    });

    describe('when an invalid IG_ACCESS_TOKEN environment variable is provided', () => {
      beforeEach(async () => {
        process.env.IG_ACCESS_TOKEN = 'bad-token';
        await main.getRecentMedia();
      });

      it('errors with the relevant message from the upstream Instagram API', () => {
        expect(main.error).toHaveBeenCalledWith('Request failed with status code 400: Invalid OAuth access token');
      });
    });
  });
});