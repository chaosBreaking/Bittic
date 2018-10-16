export default {
  namespaced: true,

  state: {
    pageEntity: [5, 10, 25],
    headers: [
      { text: 'chain.thHeight', value: 'height', align: 'center' },
      { text: 'chain.thTimestamp', value: 'timestamp', align: 'center' },
      { text: 'chain.thType', value: 'type', align: 'center' },
      { text: 'chain.thId', value: 'id', align: 'center' },
    ],
    desserts: [
      {
        height: '1',
        timestamp: '2011-11-20',
        type: '0',
        id: 'ajlk;gaklewklgjqwejj',
      },
    ],
    fetching: false,
    filter: '',
    modal: false,
  },

  mutations: {
    inputFilter(state, filter) {
      state.filter = filter
    },

    showModal(state) {
      state.modal = true
    },

    hideModal(state) {
      state.modal = false
    },
  },

  actions: {},

  getters: {},
}
