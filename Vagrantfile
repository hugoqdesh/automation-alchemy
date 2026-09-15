require "json"

Vagrant.configure("2") do |config|
  config.vm.box = "bento/ubuntu-24.04"
  config.vm.boot_timeout = 600
  config.vm.synced_folder ".", "/vagrant", disabled: true

  config.vm.define "loadbalancer" do |loadbalancer|
    loadbalancer.vm.hostname = "loadbalancer"
    loadbalancer.vm.network "private_network", ip: "192.168.56.10", virtualbox__intnet: "automation-alchemy"
    loadbalancer.vm.network "forwarded_port", guest: 80, host: 8080, host_ip: "127.0.0.1", auto_correct: true

    loadbalancer.vm.provider "virtualbox" do |vb|
      vb.memory = 1024
      vb.cpus = 1
    end
  end

  config.vm.define "web1" do |web1|
    web1.vm.hostname = "web1"
    web1.vm.network "private_network", ip: "192.168.56.11", virtualbox__intnet: "automation-alchemy"

    web1.vm.provider "virtualbox" do |vb|
      vb.memory = 1024
      vb.cpus = 1
    end
  end

  config.vm.define "web2" do |web2|
    web2.vm.hostname = "web2"
    web2.vm.network "private_network", ip: "192.168.56.12", virtualbox__intnet: "automation-alchemy"

    web2.vm.provider "virtualbox" do |vb|
      vb.memory = 1024
      vb.cpus = 1
    end
  end

  config.vm.define "app" do |app|
    app.vm.hostname = "app"
    app.vm.network "private_network", ip: "192.168.56.13", virtualbox__intnet: "automation-alchemy"

    app.vm.provider "virtualbox" do |vb|
      vb.memory = 2048
      vb.cpus = 2
    end
  end

  config.vm.define "cicd" do |cicd|
    cicd.vm.hostname = "cicd"
    cicd.vm.network "private_network", ip: "192.168.56.14", virtualbox__intnet: "automation-alchemy"

    cicd.vm.provider "virtualbox" do |vb|
      vb.memory = 2048
      vb.cpus = 2
    end
  end

  { "loadbalancer" => 2222, "web1" => 2200, "web2" => 2201, "app" => 2202, "cicd" => 2203 }.each do |name, port|
    config.vm.define name do |vm|
      vm.vm.network "forwarded_port", guest: 22, host: port, host_ip: "127.0.0.1", id: "ssh"
      machine_id = File.join(__dir__, ".vagrant/machines", name, "virtualbox/id")
      ready_id = File.join(__dir__, ".local", "#{name}.id")
      if File.exist?(machine_id) && File.exist?(ready_id) && File.read(machine_id).strip == File.read(ready_id).strip
        password = JSON.parse(File.read(File.join(__dir__, ".local/credentials.json"))).fetch("devops_password")
        raise "Invalid generated sudo password" unless password.match?(/\A[0-9a-f]{32}\z/)
        vm.ssh.username = "devops"
        vm.ssh.private_key_path = File.join(__dir__, ".local/devops_ed25519")
        vm.ssh.insert_key = false
        vm.ssh.sudo_command = "(printf '%s\\n' '#{password}'; cat) | sudo -S -p '' %c"
      end
    end
  end
end
