<template>
<div>
    <el-container style="height: 600px; border: 1px solid #eee">
      <el-aside width="200px" style="background-color: rgb(238, 241, 246)">
        <el-menu unique-opened router>
          <el-menu-item index="index">
            <template slot="title"><i class="el-icon-news"></i>首页</template>
          </el-menu-item>
          <el-menu-item index="myinfo">
            <template slot="title"><i class="el-icon-menu"></i>个人中心</template>
          </el-menu-item>
          <el-menu-item index="exchange">
            <template slot="title"><i class="el-icon-sort"></i>交易中心</template>
          </el-menu-item>
          <el-menu-item index="blocksinfo">
            <template slot="title"><i class="el-icon-setting"></i>区块信息</template>
          </el-menu-item>
          <el-menu-item index="vote">
            <template slot="title"><i class="el-icon-edit-outline"></i>投票</template>
          </el-menu-item>
        </el-menu>
      </el-aside>
      
      <el-container>
        <el-header style="text-align: right; font-size: 12px">
          <el-dropdown>
            <i class="el-icon-setting" style="margin-right: 15px"></i>
            <el-dropdown-menu slot="dropdown">
              <el-dropdown-item>查看余额</el-dropdown-item>
              <el-dropdown-item>个人信息</el-dropdown-item>
            </el-dropdown-menu>
          </el-dropdown>
          <span>Userinfo</span>
        </el-header>
        
        <el-main style="background-color:#eee">
          <router-view></router-view>
        </el-main>
      </el-container>
    </el-container>
</div>  
</template>
<script>
</script>
