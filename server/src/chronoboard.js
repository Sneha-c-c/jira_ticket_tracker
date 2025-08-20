// Dependencies
const express = require('express');
const axios = require('axios');
require('dotenv').config();
const router = express.Router();
const JIRA_BASE_URL = process.env.JIRA_BASE_URL;
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const auth = {
  username: JIRA_EMAIL,
  password: JIRA_API_TOKEN
};
// --- Helper functions ---
function jiraApi(path, params = {}) {
  return axios.get(`${JIRA_BASE_URL}/rest/api/3/${path}`, {
    params,
    auth
  });
}
// get all projects client (for client options)
async function getClients() {
  const res = await jiraApi('project/search');
  return res.data.values.map(proj => ({ key: proj.id, name: proj.name }));
}
// get all assignable users for project
async function getUsers(projectId) {
  const res = await jiraApi('user/assignable/search', { project: projectId });
  return res.data.map(user => ({ key: user.accountId, email: user.emailAddress, displayName: user.displayName }));
}
// get issues user can access (for ticket no, status, etc.)
async function getIssues(jql) {
  const res = await jiraApi('search', { jql, maxResults: 50 });
  return res.data.issues;
}
// get all statuses (for status filter)
async function getStatuses() {
  const res = await jiraApi('status');
  return res.data.map(item => ({ key: item.id, name: item.name }));
}
// --- Routes ---
/** GET /api/chronoboard/filters/options
* Query: { user } (optionally)
* Returns all filter options
*/
router.get('/filters/options', async (req, res) => {
  try {
    // For demo: get for first available project
    const clients = await getClients();
    const client = clients[0]; // Or select by user
    const users = await getUsers(client.key);
    const statuses = await getStatuses();
    // Tickets for TICKET dropdown
    const issues = await getIssues(`project=${client.key}`);
    res.json({
      clients,
      users,
      statuses,
      tickets: issues.map(x => ({ key: x.key, summary: x.fields.summary })),
      teamMembers: users, // Map what you consider a 'jira-metaz' member if needed
    });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});
/* POST /api/chronoboard/tickets/filter
Payload: {
  ticketNo, userId, clientId, statusId, startDate, endDate
}
Returns JIRA tickets matching criteria
*/
router.post('/tickets/filter', async (req, res) => {
  try {
    const { ticketNo, userId, clientId, statusId, startDate, endDate } = req.body;
    let jql = [];
    if (ticketNo)    jql.push(`key = ${ticketNo}`);
    if (userId)      jql.push(`assignee = ${userId}`);
    if (clientId)    jql.push(`project = ${clientId}`);
    if (statusId)    jql.push(`status = ${statusId}`);
    if (startDate)   jql.push(`created >= "${startDate}"`);
    if (endDate)     jql.push(`created <= "${endDate}"`);
    const jqlString = jql.length ? jql.join(' AND ') : '';
    const issues = await getIssues(jqlString);
    res.json({ tickets: issues.map(x => ({
      key: x.key,
      name: x.fields.assignee ? x.fields.assignee.displayName : '-',
      summary: x.fields.summary,
      link: `${JIRA_BASE_URL}/browse/${x.key}`,
      status: x.fields.status ? x.fields.status.name : '-'
    })) });
  } catch (e) {
    res.status(500).json({ error: e.toString() });
  }
});
module.exports = router;


