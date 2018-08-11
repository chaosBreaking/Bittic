<template>
  <div class="login">
    <el-row :gutter="20">
      <el-col>
          <el-card :body-style="{ padding: '0px' }">
            <div style="width:300px">
                <el-input placeholder="查询交易或者区块信息">
                    <el-button slot="append" icon="el-icon-search"></el-button>
                </el-input>
            </div>
            请登录后使用其他功能
          </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script>
export default {
  name: "Login",
  data() {
        var checkAmount = (rule, value, callback) => {
        if (!value) {
          return callback(new Error('发送数额不能为空'));
        }
        setTimeout(() => {
          if (!Number.isInteger(value)) {
            callback(new Error('请输入数字值'));
          } else {
              callback();
          }
        }, 1000);
      };
      var validateAddress = (rule, value, callback) => {
        if (!value) {
          callback(new Error('请输入发送地址'));
        } else {
          var pre = parseInt(value.substring(0,value.split("").length-1))
          var end = value.charAt(value.length - 1)
          if ((!Number.isInteger(pre))||(end!=="L")||value.length<18) {
            callback(new Error('不合法的地址'));
          }
          callback();
        }
      };

    return {
      ruleForm2: {
            address: '',
            amount: ''
          },
          rules2: {
            address: [
              { validator: validateAddress, trigger: 'blur' }
            ],
            amount: [
              { validator: checkAmount, trigger: 'blur' }
            ]
          },
        msg: "Blockchain BOX",
        currentDate:new Date()
    };
  },
  methods: {
      submitForm(formName) {
        this.$refs[formName].validate((valid) => {
          if (valid) {
            alert('submit!');
          } else {
            console.log('error submit!');
            return false;
          }
        });
      },
      resetForm(formName) {
        this.$refs[formName].resetFields();
      }
  }
};
</script>


<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h1, h2 {
  font-weight: normal;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}

</style>
