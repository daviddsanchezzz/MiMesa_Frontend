import axios from 'axios';

const publicApi = axios.create({ baseURL: '/api' });

export default publicApi;