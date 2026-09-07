Vagrant.configure("2") do |config|
  config.vm.box = "bento/ubuntu-24.04"
  config.vm.boot_timeout = 600
  config.vm.synced_folder ".", "/vagrant"

  config.vm.define "loadbalancer" do |loadbalancer|
    loadbalancer.vm.hostname = "loadbalancer"
    loadbalancer.vm.network "private_network", ip: "192.168.56.10"
    loadbalancer.vm.network "forwarded_port", guest: 80, host: 8080, host_ip: "127.0.0.1", auto_correct: true

    loadbalancer.vm.provider "virtualbox" do |vb|
      vb.memory = 1024
      vb.cpus = 1
    end
  end

  config.vm.define "web1" do |web1|
    web1.vm.hostname = "web1"
    web1.vm.network "private_network", ip: "192.168.56.11"

    web1.vm.provider "virtualbox" do |vb|
      vb.memory = 1024
      vb.cpus = 1
    end
  end

  config.vm.define "web2" do |web2|
    web2.vm.hostname = "web2"
    web2.vm.network "private_network", ip: "192.168.56.12"

    web2.vm.provider "virtualbox" do |vb|
      vb.memory = 1024
      vb.cpus = 1
    end
  end

  config.vm.define "app" do |app|
    app.vm.hostname = "app"
    app.vm.network "private_network", ip: "192.168.56.13"

    app.vm.provider "virtualbox" do |vb|
      vb.memory = 2048
      vb.cpus = 2
    end
  end

  config.vm.define "cicd" do |cicd|
    cicd.vm.hostname = "cicd"
    cicd.vm.network "private_network", ip: "192.168.56.14"

    cicd.vm.provider "virtualbox" do |vb|
      vb.memory = 2048
      vb.cpus = 2
    end
  end
end
