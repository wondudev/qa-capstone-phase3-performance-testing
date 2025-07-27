import http from 'k6/http';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';

// Load test data from the external JSON file
const users = new SharedArray('users', function () {
  return JSON.parse(open('./users.json'));
});

// Configure the test options, scenarios, and thresholds
export const options = {
  scenarios: {
    login_scenario: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 }, // Ramp-up
        { duration: '1m', target: 10 },  // Hold load
        { duration: '20s', target: 0 },  // Ramp-down
      ],
      gracefulRampDown: '30s',
    },
  },
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests must be below 500ms
    'http_req_failed': ['rate<0.01'],   // Error rate must be less than 1%
    'checks': ['rate>0.99'],           // Over 99% of checks must pass
  },
};

// Main function: The logic each Virtual User will execute
export default function () {
  const user = users[Math.floor(Math.random() * users.length)];
  const loginUrl = 'https://opensource-demo.orangehrmlive.com/web/index.php/auth/validate';
  const payload = {
    username: user.username,
    password: user.password,
  };

  const res = http.post(loginUrl, payload);

  // Add checks to validate the response
  check(res, {
    'Login successful (status is 200)': (r) => r.status === 200,
    'Response indicates successful login': (r) => r.body.includes('/web/index.php/dashboard/index'),
  });

  sleep(1);
}