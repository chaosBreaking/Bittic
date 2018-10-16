<template>
  <div class="home">
    <div class="side-menus" :class="{ collapsed: sideCollapsed || !isLogin }">
      <div class="side-title">
        <img src="../assets/images/logo.png" />
        <span class="white--text">TIME IN CHAIN</span>
      </div>

      <div
        class="side-menu-item"
        v-for="menu in sideMenus"
        @click="updateRoute(menu.path)"
        :class="{ active: sideSelected === menu.path }"
        :key="menu.path">
        <v-icon dark x-large>{{ menu.icon }}</v-icon>
        <div class="title white--text">{{ $t(menu.title) }}</div>
      </div>
    </div>

    <div class="app-body">
      <div class="app-header" :class="{ collapsed: !isLogin }">
        <div class="indicator" @click="toggleCollapse" :class="{ collapsed: sideCollapsed }">
          <v-icon class="right">chevron_right</v-icon>
          <v-icon class="left">chevron_left</v-icon>
        </div>

        <div class="title primary--text">{{ $t('login.title') }}</div>

        <v-select
          color="secondary"
          prepend-icon="language"
          :value="currentLang"
          @input="updateCurrentLang"
          :items="supportLangs"
          item-value="code"
          item-text="label"
        />

        <div class="separator"></div>

        <v-icon @click="logout">power_settings_new</v-icon>
      </div>

      <transition name="fade">
        <router-view class="app-container" />
      </transition>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters, mapMutations, mapActions } from 'vuex'

export default {
  name: 'Home',

  data() {
    return {
      sideSelected: this.$route.path,
    }
  },

  computed: {
    ...mapState([
      'sideMenus',
      'sideCollapsed',
      'supportLangs',
      'currentLang',
    ]),
    ...mapGetters([
      'isLogin',
    ]),
  },

  methods: {
    ...mapMutations([
      'updateRoute',
      'toggleCollapse',
      'logout',
    ]),
    ...mapActions([
      'updateCurrentLang',
    ]),
  },

  watch: {
    '$route.path'(to) {
      this.sideSelected = to
    },
  },
}
</script>

<style lang="scss" scoped>
@import "../styles/share";
.home {
  &, .app-body {
    @include full-page;
  }

  display: flex;

  $sideWidth: 260px;
  $headerHeight: 64px;
  .side-menus {
    &.collapsed {
      margin-left: -$sideWidth;
    }

    width: $sideWidth;
    background: url('../assets/images/bg.jpg') center;
    background-size: cover;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    align-items: stretch;
    box-shadow: 1px 0 2px #ddd;
    transition: margin-left .4s;

    .side-title {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 0;
      & > img {
        width: 80px;
      }
    }

    .side-menu-item {
      cursor: pointer;
      padding: 40px 0;

      transition: background-color .4s;
      position: relative;
      overflow: hidden;

      .v-icon {
        font-size: 48px!important;
      }

      .title {
        margin: 4px 0;
        font-size: 1.2em!important;
      }

      &:hover {
        background-color: rgba($secondaryColor, .15);
      }

      $indicatorSize: 24px;
      &:before {
        content: '';
        display: block;
        width: $indicatorSize;
        height: $indicatorSize;
        background-color: #fff;
        position: absolute;
        right: -$indicatorSize*2;
        top: 50%;
        transform: translateY(-50%) rotate(45deg);
        transition: right .4s;
      }

      &.active {
        background-color: rgba(white, .25);

        &:before {
          right: -$indicatorSize/2;
        }
      }
    }
  }

  .app-body {
    display: flex;
    flex-direction: column;

    .app-header {
      &.collapsed {
        margin-top: -$headerHeight;
      }

      transition: margin-top .4s;

      flex-shrink: 0;
      height: $headerHeight;
      background-color: white;
      box-shadow: 0 1px 2px #ddd;

      display: flex;
      align-items: center;

      .indicator {
        position: relative;
        $iconSize: 28px;
        width: $iconSize;
        align-self: stretch;
        margin: 0 40px;
        cursor: pointer;

        .v-icon {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          left: 0;
          font-size: $iconSize!important;
        }

        .left {
          left: 45%;
        }
        .right {
          left: -15%;
        }

        &.collapsed {
          .left {
            left: -15%;
          }
          .right {
            left: 45%;
          }
        }
      }

      .title {
        flex-grow: 1;
        text-align: left;
      }

      .v-select {
        width: 160px;
        flex-grow: 0;
        flex-shrink: 0;
      }

      .separator {
        align-self: stretch;
        margin: 20px;
        width: 1px;
        background-color: gray;
      }

      & > .v-icon {
        margin: 0 40px 0 0;
        cursor: pointer;
      }
    }

    .app-container {
      flex-grow: 1;
    }
  }

  .fade-enter-active, .fade-leave-active {
    transition-property: opacity;
    transition-duration: .25s;
  }

  .fade-enter-active {
    transition-delay: .4s;
  }

  .fade-enter, .fade-leave-active {
    opacity: 0
  }
}
</style>
