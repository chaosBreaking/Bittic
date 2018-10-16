export default {
  namespaced: true,

  state: {
    pageEntity: [5, 10, 25],
    headers: [
      { text: 'network.thIndex', value: 'index', align: 'center' },
      { text: 'network.thAddress', value: 'address', align: 'center' },
      { text: 'network.thStatus', value: 'status', align: 'center' },
      { text: 'network.thNeighbour', value: 'neighbour', align: 'center' },
    ],
    desserts: [
      {
        index: '1',
        address: '192.168.0.1',
        status: '0',
        neighbour: 'ajlk;gaklewklgjqwejj',
      },
    ],
    fetching: false,
    filter: '',
  },

  mutations: {
    inputFilter(state, filter) {
      state.filter = filter
    },
  },

  actions: {},

  getters: {},
}
